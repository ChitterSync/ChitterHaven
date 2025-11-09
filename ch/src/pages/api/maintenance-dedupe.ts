import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const HISTORY_PATH = path.join(process.cwd(), 'src/pages/api/history.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

function decryptHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return {};
  const encrypted = fs.readFileSync(HISTORY_PATH);
  if (encrypted.length <= 16) return {};
  const iv = encrypted.slice(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
  const decrypted = Buffer.concat([ decipher.update(encrypted.slice(16)), decipher.final() ]).toString();
  try { return JSON.parse(decrypted); } catch { return {}; }
}
function encryptHistory(data: any) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = Buffer.concat([ cipher.update(JSON.stringify(data)), cipher.final() ]);
  fs.writeFileSync(HISTORY_PATH, Buffer.concat([iv, encrypted]), { mode: 0o600 });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }
  const data = decryptHistory() as Record<string, any[]>;
  let rooms = 0; let removed = 0; let total = 0;
  for (const k of Object.keys(data)) {
    rooms++;
    const arr = Array.isArray(data[k]) ? data[k] : [];
    total += arr.length;
    const seen = new Set<string>();
    const dedup: any[] = [];
    for (const m of arr) {
      if (!m || !m.id) continue;
      if (!seen.has(m.id)) { seen.add(m.id); dedup.push(m); }
    }
    removed += (arr.length - dedup.length);
    data[k] = dedup;
  }
  encryptHistory(data);
  res.status(200).json({ success: true, rooms, total, removed });
}

