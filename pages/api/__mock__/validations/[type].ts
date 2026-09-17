import { NextApiRequest, NextApiResponse } from "next";

/**
 * Mock NYPL Platform API validation endpoints. Feel free to read this file
 * but do not make changes as part of your bug fix.
 *
 * Stands in for `${PATRON_VALIDATION_URL}/address` and `/username`, so the
 * address and username steps of the form work locally without credentials.
 * `.env.development` points `PATRON_VALIDATION_URL` at this directory.
 *
 * The address mock accepts anything and echoes it back as validated, which is
 * enough to reach the account and review steps. It deliberately returns a
 * single address rather than a list of Service Objects candidates: the
 * multiple-match path is already covered by the Playwright fixtures in
 * playwright/utils/mock-api.ts.
 */

/** Usernames this mock always reports as taken. */
const RESERVED_USERNAMES = ["taken", "mocktaken"];

/**
 * These two strings must match exactly, because the client looks them up in
 * the translation tables keyed by the English message — `apiTranslations` in
 * src/data/apiMessageTranslations.ts and `apiErrorTranslations` in
 * src/data/apiErrorMessageTranslations.ts respectively. Anything else leaves
 * a non-English user with an untranslated message.
 */
const USERNAME_AVAILABLE = "This username is available.";
const USERNAME_UNAVAILABLE =
  "This username is unavailable. Please try another.";

function validateAddress(req: NextApiRequest, res: NextApiResponse) {
  const submitted = req.body?.address ?? {};

  res.status(200).json({
    status: 200,
    type: "valid-address",
    cardType: "standard",
    message: "This valid address will result in a standard library card.",
    originalAddress: submitted,
    address: { ...submitted, isResidential: true, hasBeenValidated: true },
    // An empty list makes `getAddresses` in AddressVerificationContainer fall
    // back to the single `address` above.
    addresses: [],
  });
}

function validateUsername(req: NextApiRequest, res: NextApiResponse) {
  const username = String(req.body?.username ?? "");

  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    // 409 is what the real service returns, and what the Playwright
    // `usernameResponse` fixture asserts.
    res.status(409).json({
      status: 409,
      type: "unavailable-username",
      message: USERNAME_UNAVAILABLE,
    });
    return;
  }

  res.status(200).json({
    status: 200,
    type: "available-username",
    message: USERNAME_AVAILABLE,
  });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({
      status: 405,
      type: "method-not-allowed",
      detail: "Method not allowed.",
    });
    return;
  }

  const { type } = req.query;

  if (type === "address") {
    validateAddress(req, res);
    return;
  }
  if (type === "username") {
    validateUsername(req, res);
    return;
  }

  res.status(404).json({
    status: 404,
    type: "not-found",
    detail: `No mock validation endpoint for "${String(type)}".`,
  });
}
