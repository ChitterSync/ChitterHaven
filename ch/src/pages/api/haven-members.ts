import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { requireUser } from './auth';

const HISTORY_PATH = path.join(process.cwd(), 'src/pages/api/history.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

function decryptHistory(): Record<string, Array<{ user: string }>> {
  if (!fs.existsSync(HISTORY_PATH)) return {};
  const encrypted = fs.readFileSync(HISTORY_PATH);
  if (encrypted.length <= 16) return {};
  const iv = encrypted.slice(0, 16);
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted.slice(16)),
      decipher.final(),
    ]).toString();
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
  const payload = requireUser(req, res);
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
