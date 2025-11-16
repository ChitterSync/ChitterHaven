import type { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
import { verifyJWT } from "./jwt";

export interface AuthPayload {
  username: string;
  [key: string]: any;
}

// Local-only auth helper: trusts the legacy chitter_token JWT.
// This keeps all existing API routes working while we iterate on the new auth service.
export async function requireUser(req: NextApiRequest, res: NextApiResponse): Promise<AuthPayload | null> {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.chitter_token;
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
