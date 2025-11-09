import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import cookie from "cookie";
import { verifyJWT } from "./jwt";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const USERS_PATH = path.join(process.cwd(), "src/pages/api/users.json");

type UserProfile = { displayName?: string; avatarUrl?: string; bio?: string };
type User = { username: string; password: string; profile?: UserProfile; roles?: string[] };
type UsersData = { users: User[] };

function decryptUsers(): UsersData {
  if (!fs.existsSync(USERS_PATH)) return { users: [] };
  const encrypted = fs.readFileSync(USERS_PATH);
  if (encrypted.length <= 16) return { users: [] };
  const iv = encrypted.slice(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const json = Buffer.concat([decipher.update(encrypted.slice(16)), decipher.final()]).toString();
  try { return JSON.parse(json); } catch { return { users: [] }; }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.chitter_token;
  const payload: any = token ? verifyJWT(token) : null;
  const me = payload?.username;
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const q = String((req.query.q || "")).trim().toLowerCase();
  const listAll = String(req.query.all || "").toLowerCase() === 'true';

  const data = decryptUsers();
  const arr = listAll && !q ? data.users : data.users.filter(u => u.username.toLowerCase().includes(q) || (u.profile?.displayName || "").toLowerCase().includes(q));
  const results = arr
    .filter(u => u.username !== me)
    .slice(0, listAll && !q ? 100 : 10)
    .map(u => ({ username: u.username, displayName: u.profile?.displayName || u.username, avatarUrl: u.profile?.avatarUrl || "" }));
  return res.status(200).json({ results });
}
