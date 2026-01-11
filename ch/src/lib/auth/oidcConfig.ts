type OidcConfig = {
  authBaseUrl: string;
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
  sessionCookieName: string;
  chitterHavenBaseUrl: string;
};

const normalizeBaseUrl = (raw: string) => {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
};

const isRedirectAllowed = (redirectUri: string, baseUrl: string) => {
  try {
    const redirect = new URL(redirectUri);
    const base = new URL(baseUrl);
    return redirect.origin === base.origin;
  } catch {
    return false;
  }
};

export const getOidcConfig = (): OidcConfig => {
  const authBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_CS_AUTH_URL || "");
  const chitterHavenBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_CHITTERHAVEN_URL || "");
  const clientId = (process.env.CS_OIDC_CLIENT_ID || "").trim();
  const clientSecret = (process.env.CS_OIDC_CLIENT_SECRET || "").trim();
  const redirectUri = (process.env.CS_OIDC_REDIRECT_URI || "").trim();
  const scopes = (process.env.CS_OIDC_SCOPES || "openid profile email").trim();
  const sessionCookieName = (process.env.CS_SESSION_COOKIE_NAME || "ch_session").trim();

  if (!authBaseUrl || !chitterHavenBaseUrl || !clientId || !redirectUri) {
    throw new Error("ChitterSync auth is not configured.");
  }

  if (!isRedirectAllowed(redirectUri, chitterHavenBaseUrl)) {
    throw new Error("CS_OIDC_REDIRECT_URI must match NEXT_PUBLIC_CHITTERHAVEN_URL.");
  }

  return {
    authBaseUrl,
    issuer: authBaseUrl,
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    sessionCookieName,
    chitterHavenBaseUrl,
  };
};

export type { OidcConfig };
