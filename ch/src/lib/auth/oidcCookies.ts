import cookie from "cookie";

const isProduction = process.env.NODE_ENV === "production";
const TEMP_COOKIE_TTL = 10 * 60;

const STATE_COOKIE = "cs_oidc_state";
const NONCE_COOKIE = "cs_oidc_nonce";
const VERIFIER_COOKIE = "cs_oidc_verifier";
const RETURN_COOKIE = "cs_oidc_return";

type ResponseLike = {
  getHeader(name: string): number | string | string[] | undefined;
  setHeader(name: string, value: string | string[]): void;
};

const appendSetCookie = (res: ResponseLike, value: string) => {
  const current = res.getHeader("Set-Cookie");
  if (!current) {
    res.setHeader("Set-Cookie", value);
    return;
  }
  if (Array.isArray(current)) {
    res.setHeader("Set-Cookie", [...current, value]);
    return;
  }
  res.setHeader("Set-Cookie", [String(current), value]);
};

const tempCookieOptions = (maxAgeSeconds = TEMP_COOKIE_TTL) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});

export const setOidcCookies = (
  res: ResponseLike,
  {
    state,
    nonce,
    codeVerifier,
    returnTo,
  }: { state: string; nonce: string; codeVerifier: string; returnTo?: string },
) => {
  appendSetCookie(res, cookie.serialize(STATE_COOKIE, state, tempCookieOptions()));
  appendSetCookie(res, cookie.serialize(NONCE_COOKIE, nonce, tempCookieOptions()));
  appendSetCookie(res, cookie.serialize(VERIFIER_COOKIE, codeVerifier, tempCookieOptions()));
  if (returnTo) {
    appendSetCookie(res, cookie.serialize(RETURN_COOKIE, returnTo, tempCookieOptions()));
  }
};

export const readOidcCookies = (req: { headers: { cookie?: string } }) => {
  const cookies = cookie.parse(req.headers.cookie || "");
  return {
    state: cookies[STATE_COOKIE] || null,
    nonce: cookies[NONCE_COOKIE] || null,
    codeVerifier: cookies[VERIFIER_COOKIE] || null,
    returnTo: cookies[RETURN_COOKIE] || null,
  };
};

export const clearOidcCookies = (res: ResponseLike) => {
  appendSetCookie(res, cookie.serialize(STATE_COOKIE, "", tempCookieOptions(0)));
  appendSetCookie(res, cookie.serialize(NONCE_COOKIE, "", tempCookieOptions(0)));
  appendSetCookie(res, cookie.serialize(VERIFIER_COOKIE, "", tempCookieOptions(0)));
  appendSetCookie(res, cookie.serialize(RETURN_COOKIE, "", tempCookieOptions(0)));
};

export { appendSetCookie };
