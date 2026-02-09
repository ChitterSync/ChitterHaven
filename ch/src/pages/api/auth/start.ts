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
    const returnTo = sanitizeReturnTo(typeof req.query.returnTo === "string" ? req.query.returnTo : null);
    const authBase = normalizeBaseUrl(
      process.env.AUTH_BASE_URL ||
        process.env.AUTH_SERVICE_URL ||
        process.env.NEXT_PUBLIC_CS_AUTH_URL ||
        "",
    );
    const preferCentral = (process.env.CS_AUTH_START_MODE || "").toLowerCase() === "central";
    const hasOidcConfig = Boolean(process.env.CS_OIDC_CLIENT_ID && process.env.CS_OIDC_REDIRECT_URI);

    if (authBase && (preferCentral || !hasOidcConfig)) {
      const proto =
        (req.headers["x-forwarded-proto"] as string | undefined) ||
        (req.headers["X-Forwarded-Proto"] as string | undefined) ||
        "http";
      const host =
        (req.headers["x-forwarded-host"] as string | undefined) ||
        (req.headers["X-Forwarded-Host"] as string | undefined) ||
        req.headers.host ||
        "";
      const origin = host ? `${proto}://${host}` : "";
      const redirect = origin ? `${origin}${returnTo || "/"}` : returnTo || "/";
      res.writeHead(302, { Location: `${authBase}/signin?redirect=${encodeURIComponent(redirect)}` });
      return res.end();
    }

    const { verifier, challenge } = createPkcePair();
    const state = createState();
    const nonce = createState();

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
