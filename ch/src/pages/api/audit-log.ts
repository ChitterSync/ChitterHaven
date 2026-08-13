import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/server/api-lib/prismaClient";
import path from "path";
import { requireUser } from "@/server/api-lib/auth";
import { readEncryptedJson, writeEncryptedJson } from "@/lib/security/encryptedJsonFile";
import { getAuditKeyRing, getStoreKeyRing } from "@/lib/security/keyRings";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
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
  return readEncryptedJson({ filePath: LOG_PATH, purpose: "audit-log", ring: getAuditKeyRing(), legacySecret: SECRET, defaultValue: () => [], validate: (value): value is AuditEntry[] => Array.isArray(value) });
}

function writeLog(entries: AuditEntry[]) {
  writeEncryptedJson(entries, { filePath: LOG_PATH, purpose: "audit-log", ring: getAuditKeyRing(), legacySecret: SECRET, validate: (value): value is AuditEntry[] => Array.isArray(value) });
}

const SECRET2 = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const isSettings = (value: unknown): value is Record<string, any> => !!value && typeof value === "object" && !Array.isArray(value);
function decryptLocal() {
  return readEncryptedJson({ filePath: SETTINGS_PATH, purpose: "server-settings", ring: getStoreKeyRing(), legacySecret: SECRET2, defaultValue: () => ({}), validate: isSettings });
}

function encryptLocal(data: Record<string, any>) {
  writeEncryptedJson(data, { filePath: SETTINGS_PATH, purpose: "server-settings", ring: getStoreKeyRing(), legacySecret: SECRET2, validate: isSettings });
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
      encryptLocal(local);
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
