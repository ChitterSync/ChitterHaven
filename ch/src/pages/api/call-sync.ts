import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/server/api-lib/auth";
import { publishCallState } from "@/pages/api/socketio";

type CallSyncBody = {
  room?: string;
  state?: "idle" | "calling" | "in-call";
  participants?: any;
  startedAt?: number;
  from?: string;
};

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const user = await requireUser(req, res);
  if (!user) return;
  const { room, state, participants, startedAt }: CallSyncBody = req.body || {};
  if (!room || !state) {
    return res.status(400).json({ error: "Missing room or state" });
  }
  const username = user.username;
  const io = (res.socket as any)?.server?.io;
  if (!io) {
    return res.status(503).json({ error: "Socket server not initialized" });
  }
  const snapshot = publishCallState(io, room, username, state, Array.isArray(participants) ? participants : [], startedAt);
  if (!snapshot) return res.status(403).json({ error: "Not authorized for this call" });
  return res.status(200).json({ ok: true });
}
