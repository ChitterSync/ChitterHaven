import type { NextApiRequest, NextApiResponse } from "next";
import { readSessionFromRequest } from "@/lib/auth/session";
import { getAuthCookie } from "../_lib/authCookie";
import { verifyJWT } from "../jwt";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = readSessionFromRequest(req);
  if (session) {
    return res.status(200).json({ authenticated: true, provider: "chittersync", user: session.user });
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
