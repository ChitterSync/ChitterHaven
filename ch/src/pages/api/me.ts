import type { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "./jwt";
import cookie from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.chitter_token;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const payload = verifyJWT(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  res.status(200).json({ user: payload });
}
