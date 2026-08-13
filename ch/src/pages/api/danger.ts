import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/server/api-lib/prismaClient';
import { requireUser } from '@/server/api-lib/auth';
import path from 'path';
import { readEncryptedJson, writeEncryptedJson } from '@/lib/security/encryptedJsonFile';
import { getStoreKeyRing } from '@/lib/security/keyRings';

const SETTINGS_PATH = path.join(process.cwd(), 'src/pages/api/server-settings.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const isSettings = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);

function decryptLocal() {
  return readEncryptedJson({ filePath: SETTINGS_PATH, purpose: 'server-settings', ring: getStoreKeyRing(), legacySecret: SECRET, defaultValue: () => ({}), validate: isSettings });
}

function encryptLocal(data: Record<string, any>) {
  writeEncryptedJson(data, { filePath: SETTINGS_PATH, purpose: 'server-settings', ring: getStoreKeyRing(), legacySecret: SECRET, validate: isSettings });
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
          encryptLocal(local);
        }
      } catch {}
    }
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
