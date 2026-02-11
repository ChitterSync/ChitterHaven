import type { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";

const isProduction = process.env.NODE_ENV === "production";
export const AUTH_COOKIE_NAME = isProduction ? "__Host-chitter_token" : "chitter_token";

export const getAuthCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});

export const setAuthCookie = (res: NextApiResponse, token: string, maxAgeSeconds = 60 * 60 * 24 * 7) => {
  res.setHeader("Set-Cookie", cookie.serialize(AUTH_COOKIE_NAME, token, getAuthCookieOptions(maxAgeSeconds)));
};

export const clearAuthCookie = (res: NextApiResponse) => {
  res.setHeader("Set-Cookie", cookie.serialize(AUTH_COOKIE_NAME, "", getAuthCookieOptions(0)));
};

export const getAuthCookie = (req: NextApiRequest) => {
  const cookies = cookie.parse(req.headers.cookie || "");
  return cookies[AUTH_COOKIE_NAME] || null;
};
