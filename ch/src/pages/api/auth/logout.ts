import type { NextApiRequest, NextApiResponse } from "next";
import { clearSessionCookie } from "@/lib/auth/session";
import { appendSetCookie } from "@/lib/auth/oidcCookies";
import { clearAuthCookie } from "@/server/api-lib/authCookie";

const AUTH_SERVICE_BASE_RAW =
  process.env.AUTH_BASE_URL ||
  process.env.AUTH_SERVICE_URL ||
  process.env.NEXT_PUBLIC_CS_AUTH_URL ||
  "";
const AUTH_SERVICE_BASE = AUTH_SERVICE_BASE_RAW ? AUTH_SERVICE_BASE_RAW.replace(/\/$/, "") : "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  clearAuthCookie(res);
  clearSessionCookie(res);

  if (AUTH_SERVICE_BASE) {
    try {
      const authRes = await fetch(`${AUTH_SERVICE_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { cookie: req.headers.cookie || "" },
      });
      const centralCookie = authRes.headers.get("set-cookie");
      if (centralCookie) appendSetCookie(res, centralCookie);
    } catch (error) {
      console.error("[auth/logout] central logout failed:", error);
    }
  }

  return res.status(200).json({ success: true });
}
