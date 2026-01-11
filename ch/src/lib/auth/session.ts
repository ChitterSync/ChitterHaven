import crypto from "crypto";
import cookie from "cookie";
import { appendSetCookie } from "./oidcCookies";
import { base64UrlDecode, base64UrlEncode, randomBase64Url } from "./base64";

const isProduction = process.env.NODE_ENV === "production";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  email?: string | null;
  roles?: string[] | null;
};

type SessionPayload = {
  sessionId: string;
  user: SessionUser;
  createdAt: string;
  expiresAt: number;
};

const getSessionSecret = () => process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";

const getKey = () => crypto.createHash("sha256").update(getSessionSecret()).digest();

export const getSessionCookieName = () => process.env.CS_SESSION_COOKIE_NAME || "ch_session";

const getSessionCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});

const encryptSession = (payload: SessionPayload) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const json = JSON.stringify(payload);
  const ciphertext = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    base64UrlEncode(iv),
    base64UrlEncode(ciphertext),
    base64UrlEncode(tag),
  ].join(".");
};

const decryptSession = (token: string): SessionPayload | null => {
  try {
    const [ivPart, dataPart, tagPart] = token.split(".");
    if (!ivPart || !dataPart || !tagPart) return null;
    const iv = base64UrlDecode(ivPart);
    const data = base64UrlDecode(dataPart);
    const tag = base64UrlDecode(tagPart);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload?.expiresAt || Date.now() > payload.expiresAt) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

export const createSessionPayload = (user: SessionUser, ttlSeconds = SESSION_TTL_SECONDS) => {
  const sessionId = randomBase64Url(18);
  const now = new Date();
  return {
    sessionId,
    user,
    createdAt: now.toISOString(),
    expiresAt: now.getTime() + ttlSeconds * 1000,
  };
};

export const setSessionCookie = (res: { getHeader: any; setHeader: any }, session: SessionPayload) => {
  const token = encryptSession(session);
  const cookieValue = cookie.serialize(
    getSessionCookieName(),
    token,
    getSessionCookieOptions(SESSION_TTL_SECONDS),
  );
  appendSetCookie(res, cookieValue);
};

export const clearSessionCookie = (res: { getHeader: any; setHeader: any }) => {
  const cookieValue = cookie.serialize(
    getSessionCookieName(),
    "",
    getSessionCookieOptions(0),
  );
  appendSetCookie(res, cookieValue);
};

export const readSessionFromRequest = (req: { headers: { cookie?: string } }) => {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies[getSessionCookieName()];
  if (!token) return null;
  return decryptSession(token);
};
