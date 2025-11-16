import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { requireUser } from "./auth";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const REPORTS_PATH = path.join(process.cwd(), "src/pages/api/reports.json");
const IV_LENGTH = 16;

type ReportEntry = {
  ts: number;
  reporter: string;
  room?: string;
  messageId?: string;
  targetUser?: string;
  reason?: string;
  extra?: Record<string, any>;
};

function readReports(): ReportEntry[] {
  if (!fs.existsSync(REPORTS_PATH)) return [];
  const buf = fs.readFileSync(REPORTS_PATH);
  if (buf.length <= IV_LENGTH) return [];
  const iv = buf.slice(0, IV_LENGTH);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const json = Buffer.concat([
    decipher.update(buf.slice(IV_LENGTH)),
    decipher.final(),
  ]).toString();
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed.reports) ? parsed.reports : [];
  } catch {
    return [];
  }
}

function writeReports(reports: ReportEntry[]) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify({ reports })),
    cipher.final(),
  ]);
  fs.writeFileSync(REPORTS_PATH, Buffer.concat([iv, body]), { mode: 0o600 });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = requireUser(req, res);
  if (!payload) return;
  const me = payload.username as string;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { room, messageId, targetUser, reason, extra } = req.body || {};
  if (!messageId && !targetUser) {
    return res.status(400).json({ error: "messageId or targetUser is required" });
  }

  const now = Date.now();
  const reports = readReports();
  reports.push({
    ts: now,
    reporter: me,
    room: typeof room === "string" ? room : undefined,
    messageId: typeof messageId === "string" ? messageId : undefined,
    targetUser: typeof targetUser === "string" ? targetUser : undefined,
    reason: typeof reason === "string" ? reason.slice(0, 4000) : undefined,
    extra: extra && typeof extra === "object" ? extra : undefined,
  });
  // keep last 1000 reports
  writeReports(reports.slice(-1000));

  return res.status(200).json({ success: true });
}

