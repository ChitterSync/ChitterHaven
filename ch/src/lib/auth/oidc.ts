import { getOidcConfig } from "./oidcConfig";

type TokenResponse = {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export const buildAuthorizeUrl = ({
  state,
  nonce,
  codeChallenge,
}: {
  state: string;
  nonce: string;
  codeChallenge: string;
}) => {
  const config = getOidcConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });
  return `${config.authBaseUrl}/authorize?${params.toString()}`;
};

export const exchangeCodeForTokens = async (code: string, codeVerifier: string) => {
  const config = getOidcConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: codeVerifier,
  });
  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  const res = await fetch(`${config.authBaseUrl}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok) {
    return {
      ok: false,
      error: json.error || "token_exchange_failed",
      errorDescription: json.error_description || "Token exchange failed.",
    };
  }

  return { ok: true, tokens: json };
};

export type { TokenResponse };
