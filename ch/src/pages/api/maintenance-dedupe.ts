import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import crypto from 'crypto';
import { readEncryptedJson, writeEncryptedJson } from '@/lib/security/encryptedJsonFile';
import { getStoreKeyRing } from '@/lib/security/keyRings';

const HISTORY_PATH = path.join(process.cwd(), 'src/pages/api/history.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const isHistory = (value: unknown): value is Record<string, any[]> => !!value && typeof value === 'object' && !Array.isArray(value);

function decryptHistory() {
  return readEncryptedJson({ filePath: HISTORY_PATH, purpose: 'history', ring: getStoreKeyRing(), legacySecret: SECRET, defaultValue: () => ({}), validate: isHistory });
}
function encryptHistory(data: any) {
  writeEncryptedJson(data, { filePath: HISTORY_PATH, purpose: 'history', ring: getStoreKeyRing(), legacySecret: SECRET, validate: isHistory });
}

// --- handler (the main event).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }
  const maintenanceToken = process.env.MAINTENANCE_TOKEN || '';
  const suppliedToken = typeof req.headers['x-maintenance-token'] === 'string' ? req.headers['x-maintenance-token'] : '';
  if (!maintenanceToken || !suppliedToken) return res.status(404).json({ error: 'Not found' });
  const expected = Buffer.from(maintenanceToken);
  const supplied = Buffer.from(suppliedToken);
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    return res.status(403).json({ error: 'Forbidden' });
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

