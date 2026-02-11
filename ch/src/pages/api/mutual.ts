import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { verifyJWT } from '@/server/api-lib/jwt';
import { getAuthCookie } from '@/server/api-lib/authCookie';

const HISTORY_PATH = path.join(process.cwd(), 'src/pages/api/history.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

function decryptHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return {};
  const encrypted = fs.readFileSync(HISTORY_PATH);
  if (encrypted.length <= 16) return {};
  const iv = encrypted.slice(0, 16);
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
    const decrypted = Buffer.concat([ decipher.update(encrypted.slice(16)), decipher.final() ]).toString();
    return JSON.parse(decrypted);
  } catch {
    try {
      const plaintext = encrypted.toString('utf8');
      return JSON.parse(plaintext);
    } catch {
      return {};
    }
  }
}

// --- handler (the main event).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }
  const token = getAuthCookie(req);
  const payload: any = token ? verifyJWT(token) : null;
  const me = payload?.username;
  const other = String(req.query.user || '').trim();
  if (!me || !other) return res.status(400).json({ error: 'Missing user' });

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
