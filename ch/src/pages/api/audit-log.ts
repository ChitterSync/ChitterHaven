import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { requireUser } from "./auth";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const LOG_PATH = path.join(process.cwd(), "src/pages/api/audit-log.json");

type AuditEntry = {
  ts: number;
  user: string | null;
  type: string;
  message?: string;
  meta?: Record<string, any>;
};

function readLog(): AuditEntry[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  const buf = fs.readFileSync(LOG_PATH);
  if (buf.length <= 16) return [];
  const iv = buf.slice(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const json = Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString();
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function writeLog(entries: AuditEntry[]) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(entries)), cipher.final()]);
  fs.writeFileSync(LOG_PATH, Buffer.concat([iv, enc]), { mode: 0o600 });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload = await requireUser(req, res);
  if (!payload) return;
  const me = payload.username;

  const { type, message, meta } = req.body || {};
  if (!type && !message) {
    return res.status(400).json({ error: "Missing type or message" });
  }

  const entries = readLog();
  entries.push({
    ts: Date.now(),
    user: me,
    type: String(type || "feedback"),
    message: typeof message === "string" ? message.slice(0, 4000) : undefined,
    meta: meta && typeof meta === "object" ? meta : undefined
  });
  const trimmed = entries.slice(-500);
  writeLog(trimmed);

  return res.status(200).json({ success: true });
}
