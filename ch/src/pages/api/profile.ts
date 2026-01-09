import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyJWT } from './jwt';
import { readUsers, writeUsers } from './_lib/usersStore';
import { getAuthCookie } from './_lib/authCookie';

// --- handler (the main event).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getAuthCookie(req);
  const payload: any = token ? verifyJWT(token) : null;
  const username = payload?.username;
  if (!username) return res.status(401).json({ error: 'Unauthorized' });

  const usersData = readUsers();
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
    writeUsers(usersData);
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
