import type { NextApiRequest, NextApiResponse } from "next";
import { createPkcePair } from "@/lib/auth/pkce";
import { createState } from "@/lib/auth/state";
import { buildAuthorizeUrl } from "@/lib/auth/oidc";
import { setOidcCookies } from "@/lib/auth/oidcCookies";
import { sanitizeReturnTo } from "@/lib/auth/redirects";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { verifier, challenge } = createPkcePair();
    const state = createState();
    const nonce = createState();

    const returnTo = sanitizeReturnTo(typeof req.query.returnTo === "string" ? req.query.returnTo : null);
    setOidcCookies(res, { state, nonce, codeVerifier: verifier, returnTo: returnTo || undefined });

    const authorizeUrl = buildAuthorizeUrl({
      state,
      nonce,
      codeChallenge: challenge,
    });

    res.writeHead(302, { Location: authorizeUrl });
    return res.end();
  } catch {
    return res.status(500).json({ error: "ChitterSync auth is not configured." });
  }
}
