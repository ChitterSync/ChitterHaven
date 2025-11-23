import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import cookie from "cookie";
import { verifyJWT } from "./jwt";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const SETTINGS_PATH = path.join(process.cwd(), "src/pages/api/settings.json");

type UserSettings = {
  theme?: "dark" | "light" | "system";
  compact?: boolean;
  compactSidebar?: boolean;
  showTimestamps?: boolean;
  chatStyle?: string;
  messageFontSize?: string;
  accentHex?: string;
  boldColorHex?: string;
  italicColorHex?: string;
  pinColorHex?: string;
  mentionColorHex?: string;
  callHavensServers?: boolean;
  showTips?: boolean;
  reduceMotion?: boolean;
  showOnlineCount?: boolean;
  callsEnabled?: boolean;
  callRingSound?: boolean;
  callRingtone?: string;
  quickButtonsOwn?: string[];
  quickButtonsOthers?: string[];
  notifications?: { mentions?: boolean; pins?: boolean; soundEnabled?: boolean; volume?: number };
  status?: "online" | "idle" | "dnd" | "offline";
  autoIdleEnabled?: boolean;
};
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

function writeSettings(data: SettingsData) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  fs.writeFileSync(SETTINGS_PATH, Buffer.concat([iv, enc]), { mode: 0o600 });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.chitter_token;
  const payload: any = token ? verifyJWT(token) : null;
  const me = payload?.username;
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const data = readSettings();
  const current = data.users[me] || {};

  if (req.method === "GET") {
    return res.status(200).json(current);
  }

  if (req.method === "POST") {
    const patch: Partial<UserSettings> = req.body || {};
    data.users[me] = { ...current, ...patch, notifications: { ...(current.notifications || {}), ...(patch.notifications || {}) } };
    writeSettings(data);
    return res.status(200).json({ success: true, settings: data.users[me] });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
