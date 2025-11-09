import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { prisma } from "./prismaClient";
import cookie from "cookie";
import { verifyJWT } from "./jwt";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const haven = (req.query.haven || req.body.haven) as string;
  if (!haven) {
    res.status(400).json({ error: "Missing haven name" });
    return;
  }
  if (req.method === "GET") {
    // Fetch server settings from Prisma
    const setting = await prisma.serverSetting.findUnique({ where: { key: haven } });
    let value = setting ? JSON.parse(setting.value) : {};
    res.status(200).json(value);
    return;
  }
  if (req.method === "POST") {
    // Auth + permission check (manage_server)
    const cookies = cookie.parse(req.headers.cookie || "");
    const token = cookies.chitter_token;
    const payload: any = token ? verifyJWT(token) : null;
    const me = payload?.username;
    if (!me) return res.status(401).json({ error: "Unauthorized" });

    // Load permissions scaffold and check
    const settingPerm = await prisma.serverSetting.findUnique({ where: { key: haven } });
    let settingsObj: any = settingPerm ? JSON.parse(settingPerm.value) : {};
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
    const perms = settingsObj.permissions;
    const rolesMap: Record<string,string[]> = perms.roles || {};
    const memberRoles: string[] = (perms.members?.[me] || []) as string[];
    const everyone: string[] = (perms.defaults?.everyone || []) as string[];
    const has = memberRoles.some(r => (rolesMap[r] || []).includes('*') || (rolesMap[r] || []).includes('manage_server')) || everyone.includes('manage_server') || everyone.includes('*');
    if (!has) return res.status(403).json({ error: 'Forbidden' });
    const { name, description, icon, ...rest } = req.body;
    // Fetch current settings
    let setting = await prisma.serverSetting.findUnique({ where: { key: haven } });
    let value = setting ? JSON.parse(setting.value) : {};
    value = {
      ...value,
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(icon !== undefined ? { icon } : {}),
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
