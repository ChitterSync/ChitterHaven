import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import cookie from "cookie";
import { verifyJWT } from "./jwt";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const SETTINGS_PATH = path.join(process.cwd(), "src/pages/api/settings.json");

type UserSettings = { status?: "online" | "idle" | "dnd" | "offline" };
type SettingsData = { users: Record<string, UserSettings> };

function readSettings(): SettingsData {
  if (!fs.existsSync(SETTINGS_PATH)) return { users: {} };
  const buf = fs.readFileSync(SETTINGS_PATH);
  if (buf.length <= 16) return { users: {} };
  const iv = buf.slice(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const json = Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString();
  try { return JSON.parse(json); } catch { return { users: {} }; }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.chitter_token;
  const payload: any = token ? verifyJWT(token) : null;
  if (!payload?.username) return res.status(401).json({ error: "Unauthorized" });

  const usersParam = String(req.query.users || "").trim();
  const ask = usersParam ? usersParam.split(",").map(s => s.trim()).filter(Boolean) : [];
  const data = readSettings();
  const map: Record<string, string> = {};
  if (ask.length > 0) {
    for (const u of ask) map[u] = data.users[u]?.status || "offline";
  }
  return res.status(200).json({ statuses: map });
}

