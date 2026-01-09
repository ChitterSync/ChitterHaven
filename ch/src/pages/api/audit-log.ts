import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "./prismaClient";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { requireUser } from "./auth";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const LOG_PATH = path.join(process.cwd(), "src/pages/api/audit-log.json");
const SETTINGS_PATH = path.join(process.cwd(), "src/pages/api/server-settings.json");

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

const SECRET2 = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY2 = crypto.createHash("sha256").update(SECRET2).digest();
function decryptLocal() {
  if (!fs.existsSync(SETTINGS_PATH)) return {} as any;
  const buf = fs.readFileSync(SETTINGS_PATH);
  if (buf.length <= 16) return {} as any;
  const iv = buf.slice(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY2, iv);
  const json = Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString();
  try {
    return JSON.parse(json);
  } catch {
    return {} as any;
  }
}

async function loadPermissions(haven: string) {
  // Short-circuit for __dms__
  if (haven === "__dms__") {
    return {
      permissions: {
        roles: {},
        members: {},
        defaults: { everyone: [] }
      }
    } as any;
  }
  try {
    const setting = await prisma.serverSetting.findUnique({ where: { key: haven } });
    let value: any = setting ? JSON.parse(setting.value) : {};
    if (!value.permissions) {
      value.permissions = {
        roles: {
          Owner: ["*"],
          Admin: [
            "manage_server",
            "manage_roles",
            "manage_channels",
            "manage_messages",
            "pin_messages",
            "send_messages",
            "add_reactions",
            "upload_files",
            "view_channels"
          ],
          Moderator: ["manage_messages", "pin_messages", "send_messages", "add_reactions", "upload_files", "view_channels"],
          Member: ["send_messages", "add_reactions", "upload_files", "view_channels"],
          Guest: ["view_channels"]
        },
        members: {},
        defaults: { everyone: ["send_messages", "add_reactions", "view_channels"] }
      };
      if (haven === "ChitterHaven") value.permissions.members["speed_devil50"] = ["Owner"];
      await prisma.serverSetting.upsert({ where: { key: haven }, update: { value: JSON.stringify(value) }, create: { key: haven, value: JSON.stringify(value) } });
    }
    return value;
  } catch (e) {
    const local = decryptLocal();
    let value: any = (local && (local as any)[haven]) ? (local as any)[haven] : {};
    if (!value.permissions) {
      value.permissions = {
        roles: {
          Owner: ["*"],
          Admin: [
            "manage_server",
            "manage_roles",
            "manage_channels",
            "manage_messages",
            "pin_messages",
            "send_messages",
            "add_reactions",
            "upload_files",
            "view_channels"
          ],
          Moderator: ["manage_messages", "pin_messages", "send_messages", "add_reactions", "upload_files", "view_channels"],
          Member: ["send_messages", "add_reactions", "upload_files", "view_channels"],
          Guest: ["view_channels"]
        },
        members: {},
        defaults: { everyone: ["send_messages", "add_reactions", "view_channels"] }
      };
      if (haven === "ChitterHaven") value.permissions.members["speed_devil50"] = ["Owner"];
      (local as any)[haven] = value;
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", KEY2, iv);
      const enc = Buffer.concat([cipher.update(JSON.stringify(local)), cipher.final()]);
      fs.writeFileSync(SETTINGS_PATH, Buffer.concat([iv, enc]), { mode: 0o600 });
    }
    return value;
  }
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = await requireUser(req, res);
  if (!payload) return;
  const actor = payload.username;

  // Support GET to read logs and POST to append or clear entries.
  if (req.method === "GET") {
    const haven = String(req.query.haven || "").trim();
    // if a specific haven is requested we require manage_server for that haven
    if (haven) {
      const value = await loadPermissions(haven);
      const perms = value.permissions || { roles: {}, members: {}, defaults: { everyone: [] } };
      const userHasPerm = (user: string | undefined, permission: string) => {
        if (!user) return false;
        const rolesMap = perms.roles || {};
        const memberRoles = (perms.members?.[user] || []) as string[];
        const everyone: string[] = (perms.defaults?.everyone || []) as string[];
        if (memberRoles.some(r => (rolesMap[r] || []).includes("*"))) return true;
        if (memberRoles.some(r => (rolesMap[r] || []).includes(permission))) return true;
        if (everyone.includes("*") || everyone.includes(permission)) return true;
        return false;
      };
      if (!userHasPerm(actor, "manage_server")) return res.status(403).json({ error: "Forbidden" });
    }

    const entries = readLog();
    const havenFilter = String(req.query.haven || "").trim();
    const filtered = havenFilter ? entries.filter(e => (e.meta && (e.meta as any).haven) === havenFilter) : entries;
    // Return most recent 500 entries
    const resp = filtered.slice(-500);
    return res.status(200).json({ entries: resp });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, type, message, meta } = req.body || {};

  // Clear action must be explicitly allowed via manage_server for the haven
  if (action === "clear") {
    const haven = String(req.body.haven || meta?.haven || req.query.haven || "").trim();
    if (!haven) return res.status(400).json({ error: "Missing haven" });
    const value = await loadPermissions(haven);
    const perms = value.permissions || { roles: {}, members: {}, defaults: { everyone: [] } };
    const userHasPerm = (user: string | undefined, permission: string) => {
      if (!user) return false;
      const rolesMap = perms.roles || {};
      const memberRoles = (perms.members?.[user] || []) as string[];
      const everyone: string[] = (perms.defaults?.everyone || []) as string[];
      if (memberRoles.some(r => (rolesMap[r] || []).includes("*"))) return true;
      if (memberRoles.some(r => (rolesMap[r] || []).includes(permission))) return true;
      if (everyone.includes("*") || everyone.includes(permission)) return true;
      return false;
    };
    if (!userHasPerm(actor, "manage_server")) return res.status(403).json({ error: "Forbidden" });

    const entries = readLog();
    const remaining = entries.filter(e => !((e.meta && (e.meta as any).haven) === haven));
    writeLog(remaining);
    return res.status(200).json({ success: true });
  }

  // Default behaviour: append an entry
  if (!type && !message) {
    return res.status(400).json({ error: "Missing type or message" });
  }

  const entries = readLog();
  entries.push({
    ts: Date.now(),
    user: actor,
    type: String(type || "feedback"),
    message: typeof message === "string" ? message.slice(0, 4000) : undefined,
    meta: meta && typeof meta === "object" ? meta : undefined
  });
  const trimmed = entries.slice(-500);
  writeLog(trimmed);

  return res.status(200).json({ success: true });
}
