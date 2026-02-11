import type { NextApiRequest, NextApiResponse } from "next";
import { readSessionFromRequest } from "@/lib/auth/session";
import { verifyJWT } from "@/server/api-lib/jwt";
import { getAuthCookie } from "@/server/api-lib/authCookie";

const AUTH_SERVICE_BASE_RAW =
  process.env.AUTH_BASE_URL ||
  process.env.AUTH_SERVICE_URL ||
  process.env.NEXT_PUBLIC_CS_AUTH_URL ||
  "";
const AUTH_SERVICE_BASE = AUTH_SERVICE_BASE_RAW ? AUTH_SERVICE_BASE_RAW.replace(/\/$/, "") : "";

// --- auth glue (legacy token, still paying the bills).

export interface AuthPayload {
  username: string;
  [key: string]: any;
}

const fetchAuthServiceUser = async (req: NextApiRequest): Promise<AuthPayload | null> => {
  if (!AUTH_SERVICE_BASE) return null;
  try {
    const authRes = await fetch(`${AUTH_SERVICE_BASE}/api/auth/me`, {
      headers: {
        cookie: req.headers.cookie || "",
      },
    });
    if (!authRes.ok) return null;
    const data = await authRes.json();
    if (data?.authenticated && data.user?.username) {
      return { ...data.user, username: data.user.username };
    }
  } catch {
    // ignore auth service failures, fall back to legacy
  }
  return null;
};

// Local-only auth helper: trusts the legacy auth cookie JWT.
// This keeps all existing API routes working while we iterate on the new auth service.
export async function requireUser(req: NextApiRequest, res: NextApiResponse): Promise<AuthPayload | null> {
  try {
    const session = readSessionFromRequest(req);
    if (session?.user?.username) {
      return { ...session.user, username: session.user.username };
    }

    const serviceUser = await fetchAuthServiceUser(req);
    if (serviceUser) {
      return serviceUser;
    }

    const token = getAuthCookie(req);
    if (!token) {
      res.status(401).json({ error: "Not authenticated" });
      return null;
    }
    const payload = verifyJWT(token) as any;
    if (!payload || typeof payload !== "object" || !payload.username) {
      res.status(401).json({ error: "Invalid or expired token" });
      return null;
    }
    return payload as AuthPayload;
  } catch {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
}
