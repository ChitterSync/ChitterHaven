import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/server/api-lib/prismaClient";
import { requireUser } from "@/server/api-lib/auth";
import { readEncryptedJson, writeEncryptedJson } from "@/lib/security/encryptedJsonFile";
import { getStoreKeyRing } from "@/lib/security/keyRings";

const SETTINGS_PATH = path.join(process.cwd(), "src/pages/api/server-settings.json");
const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const isSettings = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === "object" && !Array.isArray(value);

function decryptSettings() {
  return readEncryptedJson({ filePath: SETTINGS_PATH, purpose: "server-settings", ring: getStoreKeyRing(), legacySecret: SECRET, defaultValue: () => ({}), validate: isSettings });
}

function encryptSettings(data: Record<string, any>) {
  writeEncryptedJson(data, { filePath: SETTINGS_PATH, purpose: "server-settings", ring: getStoreKeyRing(), legacySecret: SECRET, validate: isSettings });
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const haven = (req.query.haven || req.body.haven) as string;
  if (!haven) {
    res.status(400).json({ error: "Missing haven name" });
    return;
  }
  // __dms__ is not a haven; return empty settings gracefully
  if (haven === "__dms__") {
    if (req.method === "GET") return res.status(200).json({});
    if (req.method === "POST") return res.status(200).json({ success: true, settings: {} });
  }
  if (req.method === "GET") {
    const payload = await requireUser(req, res);
    if (!payload) return;
    // Try Prisma; if table missing, fallback to local encrypted JSON store
    try {
      const setting = await prisma.serverSetting.findUnique({ where: { key: haven } });
      let value = setting ? JSON.parse(setting.value) : {};
      if (!Array.isArray(value.channels)) value.channels = [];
      res.status(200).json(value);
      return;
    } catch (e: any) {
      const local = decryptSettings();
      const value = (local && typeof local === 'object' && (local as any)[haven]) ? (local as any)[haven] : {};
      if (!Array.isArray((value as any).channels)) (value as any).channels = [];
      res.status(200).json(value);
      return;
    }
  }
  if (req.method === "POST") {
    // Auth + permission check (manage_server)
    const payload = await requireUser(req, res);
    if (!payload) return;
    const me = payload.username;

    // Load permissions scaffold and check
    let settingsObj: any = {};
    try {
      const settingPerm = await prisma.serverSetting.findUnique({ where: { key: haven } });
      settingsObj = settingPerm ? JSON.parse(settingPerm.value) : {};
      if (!settingsObj.permissions) {
        settingsObj.permissions = {
          roles: {
            Owner: ['*'],
            Admin: ['manage_server','manage_roles','manage_channels','manage_messages','pin_messages','send_messages','add_reactions','upload_files','view_channels'],
            Moderator: ['manage_messages','pin_messages','send_messages','add_reactions','upload_files','view_channels'],
            Member: ['send_messages','add_reactions','upload_files','view_channels'],
            Guest: ['view_channels']
          },
          members: {},
          defaults: { everyone: ['send_messages','add_reactions','view_channels'] }
        };
        if (haven === 'ChitterHaven') {
          settingsObj.permissions.members['speed_devil50'] = ['Owner'];
        }
        await prisma.serverSetting.upsert({ where: { key: haven }, update: { value: JSON.stringify(settingsObj) }, create: { key: haven, value: JSON.stringify(settingsObj) } });
      }
    } catch {
      // Prisma unavailable or table missing – fallback to local encrypted JSON
      const local = decryptSettings();
      settingsObj = (local && typeof local === 'object') ? local : {};
      if (!settingsObj.permissions) {
        settingsObj.permissions = {
          roles: {
            Owner: ['*'],
            Admin: ['manage_server','manage_roles','manage_channels','manage_messages','pin_messages','send_messages','add_reactions','upload_files','view_channels'],
            Moderator: ['manage_messages','pin_messages','send_messages','add_reactions','upload_files','view_channels'],
            Member: ['send_messages','add_reactions','upload_files','view_channels'],
            Guest: ['view_channels']
          },
          members: {},
          defaults: { everyone: ['send_messages','add_reactions','view_channels'] }
        };
        if (haven === 'ChitterHaven') settingsObj.permissions.members['speed_devil50'] = ['Owner'];
        const holder: any = decryptSettings();
        holder[haven] = settingsObj;
        encryptSettings(holder);
      }
    }
    const perms = settingsObj.permissions;
    const rolesMap: Record<string,string[]> = perms.roles || {};
    const memberRoles: string[] = (perms.members?.[me] || []) as string[];
    const everyone: string[] = (perms.defaults?.everyone || []) as string[];
    const has = memberRoles.some(r => (rolesMap[r] || []).includes('*') || (rolesMap[r] || []).includes('manage_server')) || everyone.includes('manage_server') || everyone.includes('*');
    if (!has) return res.status(403).json({ error: 'Forbidden' });
    const { name, description, icon, channels, ...rest } = req.body;
    // Fetch current settings
    let setting = await prisma.serverSetting.findUnique({ where: { key: haven } });
    let value = setting ? JSON.parse(setting.value) : {};
    value = {
      ...value,
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(icon !== undefined ? { icon } : {}),
      ...(channels !== undefined ? { channels: Array.isArray(channels) ? channels : [] } : {}),
      ...rest
    };
    await prisma.serverSetting.upsert({
      where: { key: haven },
      update: { value: JSON.stringify(value) },
      create: { key: haven, value: JSON.stringify(value) },
    });
    res.status(200).json({ success: true, settings: value });
    return;
  }
  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
