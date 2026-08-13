import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { requireUser } from '@/server/api-lib/auth';
import { readEncryptedJson } from '@/lib/security/encryptedJsonFile';
import { getStoreKeyRing } from '@/lib/security/keyRings';

const HISTORY_PATH = path.join(process.cwd(), 'src/pages/api/history.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const isHistory = (value: unknown): value is Record<string, Array<{ user: string }>> => !!value && typeof value === 'object' && !Array.isArray(value);

function decryptHistory() {
  return readEncryptedJson({ filePath: HISTORY_PATH, purpose: 'history', ring: getStoreKeyRing(), legacySecret: SECRET, defaultValue: () => ({}), validate: isHistory });
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }
  const user = await requireUser(req, res);
  if (!user) return;
  const me = user.username;
  const other = String(req.query.user || '').trim();
  if (!other) return res.status(400).json({ error: 'Missing user' });

  const data = decryptHistory() as Record<string, Array<{ user: string }>>;
  const mutualHavens = new Set<string>();
  const groupDMs: Array<{ id: string; users: string[] }> = [];

  for (const room of Object.keys(data)) {
    const parts = room.split('__');
    const msgs = data[room] || [];
    const usersInRoom = Array.from(new Set(msgs.map(m => (m as any).user)));
    // Channel rooms have two parts; DMs/group DMs do not.
    if (parts.length === 2) {
      // Track mutual havens only
      const [haven] = parts as [string, string];
      if (usersInRoom.includes(me) && usersInRoom.includes(other)) {
        mutualHavens.add(haven);
      }
      continue;
    }
    // Non-channel room: consider group DM if >= 3 unique users and includes both
    if (usersInRoom.length >= 3 && usersInRoom.includes(me) && usersInRoom.includes(other)) {
      groupDMs.push({ id: room, users: usersInRoom.sort() });
    }
  }

  groupDMs.sort((a, b) => a.id.localeCompare(b.id));

  res.status(200).json({ havens: Array.from(mutualHavens.values()).sort(), groupDMs });
}
