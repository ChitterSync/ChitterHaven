import type { GetServerSideProps } from "next";
import { clearOidcCookies, readOidcCookies } from "@/lib/auth/oidcCookies";
import { isValidState } from "@/lib/auth/state";
import { exchangeCodeForTokens } from "@/lib/auth/oidc";
import { verifyIdToken } from "@/lib/auth/idToken";
import { createSessionPayload, setSessionCookie } from "@/lib/auth/session";
import { getOidcConfig } from "@/lib/auth/oidcConfig";
import { sanitizeReturnTo } from "@/lib/auth/redirects";

type CallbackProps = {
  error?: string;
};

export const getServerSideProps: GetServerSideProps<CallbackProps> = async ({ query, req, res }) => {
  const redirectWithError = (message: string) => {
    clearOidcCookies(res);
    return {
      redirect: {
        destination: `/?authError=${encodeURIComponent(message)}`,
        permanent: false,
      },
    };
  };
  const error = typeof query.error === "string" ? query.error : null;
  const errorDescription =
    typeof query.error_description === "string" ? query.error_description : null;

  if (error) {
    return redirectWithError(errorDescription || "Sign-in was cancelled.");
  }

  const code = typeof query.code === "string" ? query.code : null;
  const state = typeof query.state === "string" ? query.state : null;

  if (!code || !state) {
    return redirectWithError("Missing authorization response.");
  }

  const cookies = readOidcCookies(req);
  if (!cookies.state || !cookies.nonce || !cookies.codeVerifier) {
    return redirectWithError("Sign-in session expired. Please try again.");
  }

  if (!isValidState(cookies.state, state)) {
    return redirectWithError("Invalid sign-in state. Please retry.");
  }

  let config;
  try {
    config = getOidcConfig();
  } catch {
    return redirectWithError("ChitterSync auth is not configured.");
  }

  const tokenResult = await exchangeCodeForTokens(code, cookies.codeVerifier);
  if (!tokenResult.ok || !tokenResult.tokens?.id_token) {
    return redirectWithError(
      tokenResult.ok ? "Missing ID token." : tokenResult.errorDescription || "Token exchange failed.",
    );
  }

  const payload = await verifyIdToken(tokenResult.tokens.id_token, {
    authBaseUrl: config.authBaseUrl,
    issuer: config.issuer,
    audience: config.clientId,
    nonce: cookies.nonce,
  });

  if (!payload || typeof payload !== "object") {
    return redirectWithError("Invalid identity token.");
  }

  const username =
    (payload as any).preferred_username ||
    (payload as any).name ||
    (payload as any).email ||
    payload.sub;
  const user = {
    id: payload.sub || username,
    username: username || payload.sub || "user",
    displayName: (payload as any).name || username || payload.sub,
    avatar: (payload as any).picture || null,
    email: (payload as any).email || null,
    roles: Array.isArray((payload as any).roles) ? (payload as any).roles : null,
  };

  const session = createSessionPayload(user);
  setSessionCookie(res, session);
  clearOidcCookies(res);

  const returnTo = sanitizeReturnTo(cookies.returnTo) || "/";
  return {
    redirect: {
      destination: returnTo,
      permanent: false,
    },
  };
};

export default function CallbackPage({ error }: CallbackProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="glass max-w-md w-full p-6 rounded-2xl">
        <h1 className="text-xl font-semibold mb-2">ChitterSync Sign-In</h1>
        {error ? (
          <>
            <p className="text-sm text-red-300 mb-4">{error}</p>
            <a className="text-indigo-300 hover:text-indigo-200 text-sm" href="/">
              Back to login
            </a>
          </>
        ) : (
          <p className="text-sm text-gray-300">Finishing sign-in...</p>
        )}
      </div>
    </div>
  );
}
