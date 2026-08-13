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

async function load(haven: string) {
  if (!haven) return {} as any;
  try {
    const setting = await prisma.serverSetting.findUnique({ where: { key: haven } });
    let value: any = setting ? JSON.parse(setting.value) : {};
    if (!value.integrations) value.integrations = [];
    return value;
  } catch {
    const local = decryptLocal();
    const value = (local && (local as any)[haven]) ? (local as any)[haven] : {};
    if (!Array.isArray((value as any).integrations)) (value as any).integrations = [];
    return value;
  }
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = await requireUser(req, res);
  if (!payload) return;
  const actor = payload.username;
  const haven = String(req.query.haven || req.body?.haven || '').trim();
  if (!haven) return res.status(400).json({ error: 'Missing haven' });

  // Read
  if (req.method === 'GET') {
    const value = await load(haven);
    return res.status(200).json({ integrations: value.integrations || [] });
  }

  // Mutations -> require manage_server
  if (req.method === 'POST') {
    // load permissions and verify (reuse serverSetting row)
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
    if (!userHasPerm(actor, 'manage_server')) return res.status(403).json({ error: 'Forbidden' });

    const { action } = req.body || {};
    let value: any = await load(haven);
    const integrations = Array.isArray(value.integrations) ? value.integrations : [];
    if (action === 'add') {
      const integration = req.body.integration;
      if (!integration) return res.status(400).json({ error: 'Missing integration' });
      integrations.push(integration);
    } else if (action === 'remove') {
      const id = String(req.body.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Missing id' });
      value.integrations = integrations.filter((i: any) => String(i.id || '') !== id);
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }

    value.integrations = integrations;
    try {
      await prisma.serverSetting.upsert({ where: { key: haven }, update: { value: JSON.stringify(value) }, create: { key: haven, value: JSON.stringify(value) } });
    } catch {
      const local = decryptLocal();
      (local as any)[haven] = value;
      encryptLocal(local);
    }

    return res.status(200).json({ success: true, integrations: value.integrations });
  }

  res.setHeader('Allow', ['GET','POST']);
  res.status(405).end('Method Not Allowed');
}
