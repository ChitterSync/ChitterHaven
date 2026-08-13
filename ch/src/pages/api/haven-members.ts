import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { requireUser } from '@/server/api-lib/auth';
import { readEncryptedJson } from '@/lib/security/encryptedJsonFile';
import { getStoreKeyRing } from '@/lib/security/keyRings';

const HISTORY_PATH = path.join(process.cwd(), 'src/pages/api/history.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const isHistory = (value: unknown): value is Record<string, Array<{ user: string }>> => !!value && typeof value === 'object' && !Array.isArray(value);

function decryptHistory(): Record<string, Array<{ user: string }>> {
  return readEncryptedJson({ filePath: HISTORY_PATH, purpose: 'history', ring: getStoreKeyRing(), legacySecret: SECRET, defaultValue: () => ({}), validate: isHistory });
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }
  const payload = await requireUser(req, res);
  if (!payload) return;
  const haven = String(req.query.haven || '').trim();
  if (!haven) return res.status(400).json({ error: 'Missing haven' });

  const data = decryptHistory();
  const users = new Set<string>();
  for (const room of Object.keys(data)) {
    const parts = room.split('__');
    if (parts.length === 2 && parts[0] === haven) {
      const msgs = data[room] || [];
      for (const m of msgs) {
        if (m && typeof (m as any).user === 'string') users.add((m as any).user);
      }
    }
  }
  return res.status(200).json({ haven, users: Array.from(users.values()).sort() });
}
