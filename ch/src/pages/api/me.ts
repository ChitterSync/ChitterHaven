import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/server/api-lib/auth";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const SETTINGS_PATH = path.join(process.cwd(), "src/pages/api/settings.json");

type UserSettings = Record<string, any>;
type SettingsData = { users: Record<string, UserSettings> };

function readSettings(): SettingsData {
  if (!fs.existsSync(SETTINGS_PATH)) return { users: {} };
  const buf = fs.readFileSync(SETTINGS_PATH);
  if (buf.length <= 16) return { users: {} };
  const iv = buf.slice(0, 16);
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
    const json = Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString();
    return JSON.parse(json);
  } catch {
    try {
      const plaintext = buf.toString("utf8");
      return JSON.parse(plaintext);
    } catch {
      return { users: {} };
    }
  }
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = await requireUser(req, res);
  if (!payload) return;

  const data = readSettings();
  const settings = data.users[payload.username] || {};

  res.status(200).json({
    user: payload,
    settings,
  });
}
