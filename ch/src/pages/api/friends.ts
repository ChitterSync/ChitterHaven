import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import cookie from "cookie";
import { verifyJWT } from "./jwt";
import { ensureDMForUsers } from "./dms";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const FRIENDS_PATH = path.join(process.cwd(), "src/pages/api/friends.json");

type FriendState = { friends: string[]; incoming: string[]; outgoing: string[] };
type FriendsData = { users: Record<string, FriendState> };

function readFriends(): FriendsData {
  if (!fs.existsSync(FRIENDS_PATH)) return { users: {} };
  const buf = fs.readFileSync(FRIENDS_PATH);
  if (buf.length <= 16) return { users: {} };
  const iv = buf.slice(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const json = Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString();
  try { return JSON.parse(json); } catch { return { users: {} }; }
}

function writeFriends(data: FriendsData) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  fs.writeFileSync(FRIENDS_PATH, Buffer.concat([iv, enc]), { mode: 0o600 });
}

function ensureUser(data: FriendsData, u: string) {
  if (!data.users[u]) data.users[u] = { friends: [], incoming: [], outgoing: [] };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.chitter_token;
  const payload: any = token ? verifyJWT(token) : null;
  const me = payload?.username;
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const data = readFriends();
  ensureUser(data, me);

  if (req.method === "GET") {
    const state = data.users[me];
    return res.status(200).json(state);
  }

  if (req.method === "POST") {
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
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
