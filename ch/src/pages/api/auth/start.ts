import type { NextApiRequest, NextApiResponse } from "next";
import { createPkcePair } from "@/lib/auth/pkce";
import { createState } from "@/lib/auth/state";
import { buildAuthorizeUrl } from "@/lib/auth/oidc";
import { setOidcCookies } from "@/lib/auth/oidcCookies";
import { sanitizeReturnTo } from "@/lib/auth/redirects";

const normalizeBaseUrl = (raw: string) => {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
};

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
    const authBase = normalizeBaseUrl(
      process.env.AUTH_BASE_URL ||
        process.env.AUTH_SERVICE_URL ||
        process.env.NEXT_PUBLIC_CS_AUTH_URL ||
        "",
    );
    const preferCentral = (process.env.CS_AUTH_START_MODE || "").toLowerCase() === "central";

    if (authBase && preferCentral) {
      const redirect = returnTo || "/";
      res.writeHead(302, { Location: `${authBase}/signin?redirect=${encodeURIComponent(redirect)}` });
      return res.end();
    }

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
