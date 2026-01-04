import type { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";
import { verifyJWT } from "./jwt";

type CallSyncBody = {
  room?: string;
  state?: "idle" | "calling" | "in-call";
  participants?: any;
  startedAt?: number;
  from?: string;
};

const getUsernameFromRequest = (req: NextApiRequest): string | null => {
  try {
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.chitter_token;
    const payload: any = token ? verifyJWT(token) : null;
    if (payload?.username) return String(payload.username);
  } catch {}
  return null;
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { room, state, participants, startedAt, from }: CallSyncBody = req.body || {};
  if (!room || !state) {
    return res.status(400).json({ error: "Missing room or state" });
  }
  const username = getUsernameFromRequest(req) || (typeof from === "string" ? from : null);
  const io = (res.socket as any)?.server?.io;
  if (!io) {
    return res.status(503).json({ error: "Socket server not initialized" });
  }
  io.to(room).emit("call-state", {
    room,
    state,
    from: username || undefined,
    startedAt,
    participants,
  });
  return res.status(200).json({ ok: true });
}
