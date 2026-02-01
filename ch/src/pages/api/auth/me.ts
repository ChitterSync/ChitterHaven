import type { NextApiRequest, NextApiResponse } from "next";
import { readSessionFromRequest } from "@/lib/auth/session";
import { getAuthCookie } from "../_lib/authCookie";
import { verifyJWT } from "../jwt";

const AUTH_SERVICE_BASE_RAW =
  process.env.AUTH_BASE_URL ||
  process.env.AUTH_SERVICE_URL ||
  process.env.NEXT_PUBLIC_CS_AUTH_URL ||
  "";
const AUTH_SERVICE_BASE = AUTH_SERVICE_BASE_RAW ? AUTH_SERVICE_BASE_RAW.replace(/\/$/, "") : "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = readSessionFromRequest(req);
  if (session) {
    return res.status(200).json({ authenticated: true, provider: "chittersync", user: session.user });
  }

  if (AUTH_SERVICE_BASE) {
    try {
      const authRes = await fetch(`${AUTH_SERVICE_BASE}/api/auth/me`, {
        headers: {
          cookie: req.headers.cookie || "",
        },
      });
      if (authRes.ok) {
        const data = await authRes.json();
        if (data?.authenticated) {
          return res.status(200).json({
            ...data,
            provider: data.provider || "chittersync",
          });
        }
      }
    } catch (error) {
      console.error("[auth/me] auth service check failed:", error);
    }
  }

  const token = getAuthCookie(req);
  const payload: any = token ? verifyJWT(token) : null;
  if (payload && typeof payload === "object" && payload.username) {
    return res.status(200).json({
      authenticated: true,
      provider: "legacy",
      user: {
        id: payload.username,
        username: payload.username,
        displayName: payload.username,
      },
    });
  }

  return res.status(200).json({ authenticated: false, provider: null, user: null });
}
