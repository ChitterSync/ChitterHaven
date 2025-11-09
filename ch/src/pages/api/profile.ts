import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import cookie from 'cookie';
import { verifyJWT } from './jwt';

const USERS_PATH = path.join(process.cwd(), 'src/pages/api/users.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

type UserProfile = {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  bannerUrl?: string;
  pronouns?: string;
  website?: string;
  location?: string;
  [key: string]: any;
};
type User = { username: string; password: string; profile?: UserProfile; roles?: string[] };
type UsersData = { users: User[] };

function decryptUsers(): UsersData {
  if (!fs.existsSync(USERS_PATH)) return { users: [] };
  const encrypted = fs.readFileSync(USERS_PATH);
  if (encrypted.length <= 16) return { users: [] };
  const iv = encrypted.slice(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted.slice(16)),
    decipher.final(),
  ]).toString();
  try {
    return JSON.parse(decrypted);
  } catch {
    return { users: [] };
  }
}

function encryptUsers(data: UsersData) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  fs.writeFileSync(USERS_PATH, Buffer.concat([iv, encrypted]), { mode: 0o600 });
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.chitter_token;
  const payload: any = token ? verifyJWT(token) : null;
  const username = payload?.username;
  if (!username) return res.status(401).json({ error: 'Unauthorized' });

  const usersData = decryptUsers();
  const user = usersData.users.find((u) => u.username === username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (req.method === 'GET') {
    // Allow public lookup by ?user=username
    const queryUser = (req.query.user as string) || username;
    const publicUser = usersData.users.find((u) => u.username === queryUser);
    if (!publicUser) return res.status(404).json({ error: 'User not found' });
    const p = publicUser.profile || {};
    const out = {
      username: publicUser.username,
      displayName: p.displayName || publicUser.username,
      avatarUrl: p.avatarUrl || '',
      bio: p.bio || '',
      bannerUrl: p.bannerUrl || '',
      pronouns: p.pronouns || '',
      website: p.website || '',
      location: p.location || ''
    };
    return res.status(200).json(out);
  }

  if (req.method === 'POST') {
    const { displayName, avatarUrl, bio, bannerUrl, pronouns, website, location } = req.body || {};
    user.profile = user.profile || {};
    if (typeof displayName === 'string') user.profile.displayName = displayName;
    if (typeof avatarUrl === 'string') user.profile.avatarUrl = avatarUrl;
    if (typeof bio === 'string') user.profile.bio = bio;
    if (typeof bannerUrl === 'string') user.profile.bannerUrl = bannerUrl;
    if (typeof pronouns === 'string') user.profile.pronouns = pronouns;
    if (typeof website === 'string') user.profile.website = website;
    if (typeof location === 'string') user.profile.location = location;
    encryptUsers(usersData);
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
