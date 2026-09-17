import { NextApiRequest, NextApiResponse } from "next";

/**
 * Mock NYPL Platform API patron creation endpoint. Feel free to read this file
 * but do not make changes as part of your bug fix.
 *
 * Stands in for `PATRON_CREATION_URL` — the Card Creator endpoint of the
 * Patron Creator Service ("PCS") — so the form can be submitted locally
 * without credentials. `.env.local` points `PATRON_CREATION_URL` here.
 *
 * The password rules below are not arbitrary. They reproduce the two checks a
 * submitted password really has to clear, in the order it clears them: PCS
 * validates the card itself, and anything it accepts goes on to Sierra, which
 * applies its own PIN rules. Both sets of rules are stricter than the
 * validation this app runs in the browser, and the response shapes they
 * produce on failure are different from each other, which is why a password
 * rejection is easy to mistake for a service outage.
 */

/**
 * PCS's password policy, taken from the message PCS itself returns when a
 * password fails it: 8-32 characters, a mixture of upper and lower case, a
 * mixture of letters and numbers, and at least one special character.
 *
 * `isValidPinPattern` in src/utils/utils.ts — the check this app runs in the
 * browser — enforces none of those four. It constrains only the character
 * set, the length, and repetition. So "abcdefgh" passes the form and is
 * rejected here.
 */
const failsPcsPasswordPolicy = (password: string): boolean =>
  password.length < 8 ||
  password.length > 32 ||
  !/[a-z]/.test(password) ||
  !/[A-Z]/.test(password) ||
  !/\d/.test(password) ||
  !/[.~!?@#$%^&*()]/.test(password);

/**
 * Sierra's "trivial PIN" check: a character repeated three or more times, or a
 * repeated pattern.
 *
 * The frontend's equivalent is `(?!.*(.{2,4})\2)`, which only catches a
 * repeated group of two to four characters. Sierra is not bounded that way, so
 * a password repeating a longer group — "Abcde1!Abcde1!" — passes the form and
 * is rejected here.
 */
const isTrivialPin = (password: string): boolean =>
  /(.)\1{2}/.test(password) || /(.{2,})\1/.test(password);

const PCS_PASSWORD_POLICY_MESSAGE =
  "Password should be 8-32 alphanumeric characters and should include a " +
  "mixture of both uppercase and lowercase letters, include a mixture of " +
  "letters and numbers, and have at least one special character. Please " +
  "revise your password.";

/**
 * How PCS forwards a Sierra rejection: `IlsClient.createPatron` wraps Sierra's
 * own description as `Invalid request to ILS: ${description}`. Note there is
 * no field name anywhere in the response — only this string.
 */
const ILS_TRIVIAL_PIN_DETAIL =
  "Invalid request to ILS: PIN is not valid : PIN is trivial";

const USERNAME_UNAVAILABLE =
  "This username is unavailable. Please try another.";

/** Usernames this mock always reports as taken. */
const RESERVED_USERNAMES = ["taken", "mocktaken"];

/**
 * Variants this mock deliberately does not produce, because they are
 * unreachable through the form and so would only ever be dead code here:
 *
 *   - "PIN is too short" / "PIN is too long": both the browser and
 *     `validateAccountFormData` enforce 8-32 characters first, and Sierra's
 *     own bounds are not published.
 *   - "PINs must match": `constructPatronObject` drops `verifyPassword`, so it
 *     never reaches this endpoint.
 *   - PCS's legacy 4-character `pin` rule: unreachable below the 8-character
 *     minimum.
 *
 * All of these are covered by unit tests against the error-parsing code
 * instead, where the response can be constructed directly.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({
      status: 405,
      type: "method-not-allowed",
      detail: "Method not allowed.",
    });
    return;
  }

  const { password = "", username = "" } = req.body ?? {};

  if (RESERVED_USERNAMES.includes(String(username).toLowerCase())) {
    res.status(400).json({
      status: 400,
      type: "unavailable-username",
      title: "Invalid Request",
      detail: USERNAME_UNAVAILABLE,
      message: USERNAME_UNAVAILABLE,
    });
    return;
  }

  // PCS validates the card before forwarding anything to Sierra, so its own
  // rejections come first. These carry an `error` object keyed by field name.
  if (failsPcsPasswordPolicy(String(password))) {
    res.status(400).json({
      status: 400,
      type: "invalid-request",
      title: "Invalid Request",
      detail: "There was an error with the request.",
      error: { password: PCS_PASSWORD_POLICY_MESSAGE },
    });
    return;
  }

  // Anything PCS accepts goes on to Sierra, whose rejection arrives as a bare
  // `detail` string with no field attached.
  if (isTrivialPin(String(password))) {
    res.status(400).json({
      status: 400,
      type: "invalid-request",
      title: "Invalid Request",
      detail: ILS_TRIVIAL_PIN_DETAIL,
      message: ILS_TRIVIAL_PIN_DETAIL,
    });
    return;
  }

  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 3);

  // `createPatron` throws unless the body carries a numeric `status`, and the
  // route passes that value straight to `res.status()`, so it has to be a
  // valid HTTP status. `ptype: 2` selects the standard (non-temporary) card
  // variant of the congrats page.
  res.status(201).json({
    status: 200,
    type: "card-granted",
    barcode: "25555000000000",
    username,
    password,
    temporary: false,
    patronId: 12345678,
    ptype: 2,
    expirationDate: expirationDate.toISOString().split("T")[0],
    message: "The library card will be a standard library card.",
    link: "",
  });
}
