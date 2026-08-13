import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ensureDMForUsers } from "./dms";
import { requireUser } from "@/server/api-lib/auth";
import { getClientIp, isExemptUsername, rateLimit } from "@/server/api-lib/rateLimit";
import { readEncryptedJson, writeEncryptedJson } from "@/lib/security/encryptedJsonFile";
import { getStoreKeyRing } from "@/lib/security/keyRings";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const FRIENDS_PATH = path.join(process.cwd(), "src/pages/api/friends.json");

type FriendState = { friends: string[]; incoming: string[]; outgoing: string[] };
type FriendsData = { users: Record<string, FriendState> };
type FriendEventType = "received" | "accepted" | "denied" | "cancelled" | "removed";

function readFriends(): FriendsData {
  if (!fs.existsSync(FRIENDS_PATH)) return { users: {} };
  return readEncryptedJson({filePath:FRIENDS_PATH,purpose:"friend-relationships",ring:getStoreKeyRing(),legacySecret:SECRET,validate:(value):value is FriendsData=>Boolean(value&&typeof value==="object"&&(value as FriendsData).users&&typeof(value as FriendsData).users==="object")});
}

function writeFriends(data: FriendsData) {
  writeEncryptedJson(data,{filePath:FRIENDS_PATH,purpose:"friend-relationships",ring:getStoreKeyRing(),legacySecret:SECRET,validate:(value):value is FriendsData=>Boolean(value&&typeof value==="object"&&(value as FriendsData).users&&typeof(value as FriendsData).users==="object")});
}

function ensureUser(data: FriendsData, u: string) {
  if (!data.users[u]) data.users[u] = { friends: [], incoming: [], outgoing: [] };
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  const user = await requireUser(req, res);
  if (!user) return;
  const me = user.username;

  const data = readFriends();
  ensureUser(data, me);

  if (req.method === "GET") {
    const state = data.users[me];
    return res.status(200).json(state);
  }

  if (req.method === "POST") {
    const emitFriendState = (recipient: string, type: FriendEventType, actor: string) => {
      const io = (res.socket as any)?.server?.io;
      if (!io || !data.users[recipient]) return;
      io.to(`user:${recipient}`).emit("friend-state", {
        type,
        actor,
        state: data.users[recipient],
        occurredAt: Date.now(),
        _event: {
          eventId: crypto.randomUUID(),
          type: `friend.${type}`,
          entityId: [actor, recipient].sort().join(":"),
          actorId: actor,
          serverTimestamp: new Date().toISOString(),
        },
      });
    };
    if (!isExemptUsername(me)) {
      const ip = getClientIp(req);
      const limit = rateLimit(`friends:${me || ip}`, 30, 60_000);
      if (!limit.allowed) {
        return res.status(429).json({ error: "Too many friend requests. Try again later." });
      }
    }
    const { action, target } = req.body || {};
    if (!action) return res.status(400).json({ error: "Missing action" });

    if (action === "request") {
      if (!target || target === me) return res.status(400).json({ error: "Invalid target" });
      ensureUser(data, target);
      const A = data.users[me];
      const B = data.users[target];
      if (A.friends.includes(target)) return res.status(200).json({ success: true });
      if (!A.outgoing.includes(target)) A.outgoing.push(target);
      if (!B.incoming.includes(me)) B.incoming.push(me);
      writeFriends(data);
      emitFriendState(target, "received", me);
      return res.status(200).json({ success: true });
    }

    if (action === "accept") {
      if (!target) return res.status(400).json({ error: "Missing target" });
      ensureUser(data, target);
      const A = data.users[me];
      const B = data.users[target];
      A.incoming = A.incoming.filter((u) => u !== target);
      B.outgoing = B.outgoing.filter((u) => u !== me);
      if (!A.friends.includes(target)) A.friends.push(target);
      if (!B.friends.includes(me)) B.friends.push(me);
      writeFriends(data);
      // Ensure a DM exists between the two users
      try { ensureDMForUsers(me, target); } catch {}
      emitFriendState(target, "accepted", me);
      return res.status(200).json({ success: true });
    }

    if (action === "decline") {
      if (!target) return res.status(400).json({ error: "Missing target" });
      ensureUser(data, target);
      const A = data.users[me];
      const B = data.users[target];
      A.incoming = A.incoming.filter((u) => u !== target);
      B.outgoing = B.outgoing.filter((u) => u !== me);
      writeFriends(data);
      emitFriendState(target, "denied", me);
      return res.status(200).json({ success: true });
    }

    if (action === "cancel") {
      if (!target) return res.status(400).json({ error: "Missing target" });
      ensureUser(data, target);
      const A = data.users[me];
      const B = data.users[target];
      A.outgoing = A.outgoing.filter((u) => u !== target);
      B.incoming = B.incoming.filter((u) => u !== me);
      writeFriends(data);
      emitFriendState(target, "cancelled", me);
      return res.status(200).json({ success: true });
    }

    if (action === "remove") {
      if (!target) return res.status(400).json({ error: "Missing target" });
      ensureUser(data, target);
      const A = data.users[me];
      const B = data.users[target];
      A.friends = A.friends.filter((u) => u !== target);
      B.friends = B.friends.filter((u) => u !== me);
      writeFriends(data);
      emitFriendState(target, "removed", me);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
