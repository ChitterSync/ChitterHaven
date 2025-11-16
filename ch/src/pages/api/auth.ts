import type { NextApiRequest, NextApiResponse } from "next";

export interface AuthPayload {
  userId: string;
  username: string;
  [key: string]: any;
}

const AUTH_BASE_URL = process.env.AUTH_BASE_URL || "https://auth.chittersync.com";

export async function requireUser(req: NextApiRequest, res: NextApiResponse): Promise<AuthPayload | null> {
  try {
    const cookie = req.headers.cookie || "";
    if (!cookie || !cookie.includes("cs_auth_session=")) {
      res.status(401).json({ error: "Not authenticated" });
      return null;
    }
    const url = `${AUTH_BASE_URL.replace(/\/$/, "")}/api/me`;
    const r = await fetch(url, {
      method: "GET",
      headers: {
        cookie,
      },
    });
    if (!r.ok) {
      res.status(401).json({ error: "Not authenticated" });
      return null;
    }
    const data = await r.json().catch(() => null);
    if (!data?.user || !data.user.username) {
      res.status(401).json({ error: "Not authenticated" });
      return null;
    }
    return {
      userId: data.user.userId,
      username: data.user.username,
      ...data.user,
    } as AuthPayload;
  } catch {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
}
