import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/server/api-lib/prismaClient';
import { requireUser } from '@/server/api-lib/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SETTINGS_PATH = path.join(process.cwd(), 'src/pages/api/server-settings.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

function decryptLocal() {
  if (!fs.existsSync(SETTINGS_PATH)) return {} as any;
  const buf = fs.readFileSync(SETTINGS_PATH);
  if (buf.length <= 16) return {} as any;
  const iv = buf.slice(0, 16);
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
    const json = Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString();
    return JSON.parse(json);
  } catch {
    try {
      const plaintext = buf.toString('utf8');
      const parsed = JSON.parse(plaintext);
      const iv2 = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv2);
      const enc = Buffer.concat([cipher.update(JSON.stringify(parsed)), cipher.final()]);
      fs.writeFileSync(SETTINGS_PATH, Buffer.concat([iv2, enc]), { mode: 0o600 });
      return parsed;
    } catch {
      return {} as any;
    }
  }
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }
  const payload = await requireUser(req, res);
  if (!payload) return;
  const me = payload.username;
  const { action } = req.body || {};
  const haven = String(req.body.haven || req.query.haven || '').trim();
  if (!haven) return res.status(400).json({ error: 'Missing haven' });

  // load permissions scaffold to check manage_server
  let settingsObj: any = {};
  try {
    const setting = await prisma.serverSetting.findUnique({ where: { key: haven } });
    settingsObj = setting ? JSON.parse(setting.value) : {};
  } catch {
    const local = decryptLocal();
    settingsObj = (local && (local as any)[haven]) ? (local as any)[haven] : {};
  }
  const perms = settingsObj.permissions || { roles: {}, members: {}, defaults: { everyone: [] } };
  const userHasPerm = (user: string | undefined, permission: string) => {
    if (!user) return false;
    const rolesMap = perms.roles || {};
    const memberRoles = (perms.members?.[user] || []) as string[];
    const everyone: string[] = (perms.defaults?.everyone || []) as string[];
    if (memberRoles.some(r => (rolesMap[r] || []).includes('*'))) return true;
    if (memberRoles.some(r => (rolesMap[r] || []).includes(permission))) return true;
    if (everyone.includes('*') || everyone.includes(permission)) return true;
    return false;
  };

  if (!userHasPerm(me, 'manage_server')) return res.status(403).json({ error: 'Forbidden' });

  if (action === 'delete-server') {
    try {
      await prisma.serverSetting.delete({ where: { key: haven } });
    } catch (e) {
      // clear local fallback
      try {
        const local = decryptLocal();
        if (local && (local as any)[haven]) {
          delete (local as any)[haven];
          const iv = crypto.randomBytes(16);
          const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
          const enc = Buffer.concat([cipher.update(JSON.stringify(local)), cipher.final()]);
          fs.writeFileSync(SETTINGS_PATH, Buffer.concat([iv, enc]), { mode: 0o600 });
        }
      } catch {}
    }
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
