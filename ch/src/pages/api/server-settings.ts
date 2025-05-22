import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const SETTINGS_PATH = path.join(process.cwd(), "src/pages/api/server-settings.json");
const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const IV_LENGTH = 16;

function decryptSettings() {
  if (!fs.existsSync(SETTINGS_PATH)) return {};
  const encrypted = fs.readFileSync(SETTINGS_PATH);
  if (encrypted.length <= IV_LENGTH) return {};
  const iv = encrypted.slice(0, IV_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted.slice(IV_LENGTH)),
    decipher.final()
  ]).toString();
  try {
    return JSON.parse(decrypted);
  } catch {
    return {};
  }
}

function encryptSettings(data: Record<string, any>) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data)),
    cipher.final()
  ]);
  fs.writeFileSync(SETTINGS_PATH, Buffer.concat([iv, encrypted]), { mode: 0o600 });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const haven = (req.query.haven || req.body.haven) as string;
  if (!haven) {
    res.status(400).json({ error: "Missing haven name" });
    return;
  }
  let settings = decryptSettings();
  if (req.method === "GET") {
    res.status(200).json(settings[haven] || {});
    return;
  }
  if (req.method === "POST") {
    const { name, description, icon, ...rest } = req.body;
    settings[haven] = {
      ...(settings[haven] || {}),
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(icon !== undefined ? { icon } : {}),
      ...rest
    };
    encryptSettings(settings);
    res.status(200).json({ success: true, settings: settings[haven] });
    return;
  }
  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
