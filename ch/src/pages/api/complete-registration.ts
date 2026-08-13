import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthCookie, setAuthCookie } from "@/server/api-lib/authCookie";
import { signJWT, verifyJWT } from "@/server/api-lib/jwt";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }
  const token = getAuthCookie(req);
  const payload = token ? verifyJWT(token) : null;
  if (!payload || typeof payload === "string" || !payload.username || payload.accountSetup !== true) {
    return res.status(403).json({ error: "No registration setup is active." });
  }
  setAuthCookie(res, signJWT({ username: String(payload.username) }));
  return res.status(200).json({ success: true });
}
