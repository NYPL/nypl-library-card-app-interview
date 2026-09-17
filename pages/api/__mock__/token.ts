import { NextApiRequest, NextApiResponse } from "next";

/**
 * Mock OAuth token endpoint. Feel free to read this file
 * but do not make changes as part of your bug fix.
 *
 * Stands in for the OAuth provider that guards the NYPL Platform API, so the
 * app can be run locally without client credentials. `.env.local` points
 * `OAUTH_PROVIDER_URL` here.
 *
 * `initializeAppAuth` in src/utils/api.ts reads only `access_token` and
 * `expires_in`, and caches the result for the lifetime of the process.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  // Computed keys keep the OAuth wire format's snake_case out of the
  // camelcase lint rule, matching how the rest of the repo spells them.
  res.status(200).json({
    ["access_token"]: "mock-access-token",
    ["token_type"]: "Bearer",
    ["expires_in"]: 3600,
    scope: "account:write account:read",
  });
}
