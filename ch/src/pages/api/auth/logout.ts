import type { NextApiRequest, NextApiResponse } from "next";
import { clearSessionCookie } from "@/lib/auth/session";
import { clearAuthCookie } from "../_lib/authCookie";

const AUTH_SERVICE_BASE_RAW =
  process.env.AUTH_BASE_URL ||
  process.env.AUTH_SERVICE_URL ||
  process.env.NEXT_PUBLIC_CS_AUTH_URL ||
  "";
const AUTH_SERVICE_BASE = AUTH_SERVICE_BASE_RAW ? AUTH_SERVICE_BASE_RAW.replace(/\/$/, "") : "";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (AUTH_SERVICE_BASE) {
    fetch(`${AUTH_SERVICE_BASE}/api/auth/logout`, {
      method: "POST",
      headers: {
        cookie: req.headers.cookie || "",
      },
    }).catch(() => {});
  }

  clearAuthCookie(res);
  clearSessionCookie(res);

  return res.status(200).json({ success: true });
}
