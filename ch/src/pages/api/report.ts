import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import { requireUser } from "@/server/api-lib/auth";
import { readEncryptedJson, writeEncryptedJson } from "@/lib/security/encryptedJsonFile";
import { getStoreKeyRing } from "@/lib/security/keyRings";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const REPORTS_PATH = path.join(process.cwd(), "src/pages/api/reports.json");

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
  return readEncryptedJson({
    filePath: REPORTS_PATH,
    purpose: "reports",
    ring: getStoreKeyRing(),
    legacySecret: SECRET,
    defaultValue: () => ({ reports: [] }),
    validate: (value): value is { reports: ReportEntry[] } =>
      !!value && typeof value === "object" && Array.isArray((value as { reports?: unknown }).reports),
  }).reports;
}

function writeReports(reports: ReportEntry[]) {
  writeEncryptedJson({ reports }, {
    filePath: REPORTS_PATH,
    purpose: "reports",
    ring: getStoreKeyRing(),
    legacySecret: SECRET,
    validate: (value): value is { reports: ReportEntry[] } =>
      !!value && typeof value === "object" && Array.isArray((value as { reports?: unknown }).reports),
  });
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = await requireUser(req, res);
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
