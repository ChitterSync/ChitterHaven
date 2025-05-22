import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { verify } from 'jsonwebtoken';
import { parse } from 'cookie';

const USERS_PATH = path.join(process.cwd(), 'src/pages/api/users.json');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'defaultkeydefaultkeydefaultkey12'; // 32 chars
const IV_LENGTH = 16;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

function decrypt(text: string) {
  const bData = Buffer.from(text, 'base64');
  const iv = bData.slice(0, IV_LENGTH);
  const encryptedText = bData.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function encrypt(text: string) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return Buffer.concat([iv, encrypted]).toString('base64');
}

function getUserFromToken(req: NextApiRequest) {
  const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
  const token = cookies.token;
  if (!token) return null;
  try {
    const decoded = verify(token, JWT_SECRET) as { username: string };
    return decoded.username;
  } catch {
    return null;
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!fs.existsSync(USERS_PATH)) {
    return res.status(500).json({ error: 'User data not found.' });
  }
  const encData = fs.readFileSync(USERS_PATH, 'utf8');
  const users = JSON.parse(decrypt(encData));
  const username = getUserFromToken(req);
  if (!username) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const user = users.find((u: any) => u.username === username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (req.method === 'GET') {
    // Return profile fields only
    const { displayName, avatarUrl, bio } = user;
    return res.status(200).json({ displayName, avatarUrl, bio });
  }

  if (req.method === 'POST') {
    const { displayName, avatarUrl, bio } = req.body;
    user.displayName = displayName || user.displayName;
    user.avatarUrl = avatarUrl || user.avatarUrl;
    user.bio = bio || user.bio;
    fs.writeFileSync(USERS_PATH, encrypt(JSON.stringify(users)), 'utf8');
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
