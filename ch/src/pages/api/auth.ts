import type { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "./jwt";
import { getAuthCookie } from "./_lib/authCookie";

// --- auth glue (legacy token, still paying the bills).

export interface AuthPayload {
  username: string;
  [key: string]: any;
}

// Local-only auth helper: trusts the legacy auth cookie JWT.
// This keeps all existing API routes working while we iterate on the new auth service.
export async function requireUser(req: NextApiRequest, res: NextApiResponse): Promise<AuthPayload | null> {
  try {
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
