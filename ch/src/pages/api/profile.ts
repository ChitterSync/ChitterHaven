import type { NextApiRequest, NextApiResponse } from 'next';
import { readUsers, writeUsers } from '@/server/api-lib/usersStore';
import { requireUser } from '@/server/api-lib/auth';
import { getClientIp, isExemptUsername, rateLimit } from "@/server/api-lib/rateLimit";

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await requireUser(req, res);
  if (!user) return;
  const username = user.username;
  const isCentralAccount = user.authProvider !== 'legacy';

  const AUTH_SERVICE_BASE_RAW =
    process.env.AUTH_SERVICE_URL || process.env.AUTH_BASE_URL || process.env.NEXT_PUBLIC_CS_AUTH_URL || "";
  const AUTH_SERVICE_BASE = AUTH_SERVICE_BASE_RAW ? AUTH_SERVICE_BASE_RAW.replace(/\/$/, "") : "";
  const AUTH_SERVICE_KEY = process.env.AUTH_SERVICE_KEY || process.env.SERVICE_API_KEY || "";
  const hasAuthService = Boolean(AUTH_SERVICE_BASE && AUTH_SERVICE_KEY);

  const usersData = readUsers();
  const ensureLocalUser = (userName: string) => {
    let record = usersData.users.find((u) => u.username === userName);
    if (!record) {
      record = { username: userName, profile: {} };
      usersData.users.push(record);
    }
    return record;
  };

  if (req.method === 'GET') {
    // Allow public lookup by ?user=username
    const queryUser = (req.query.user as string) || username;
    const localUser = usersData.users.find((u) => u.username === queryUser);
    let profileFromAuth: any = null;
    if (hasAuthService) {
      try {
        const authRes = await fetch(
          `${AUTH_SERVICE_BASE}/api/service/profile?username=${encodeURIComponent(queryUser)}`,
          { headers: { Authorization: `Bearer ${AUTH_SERVICE_KEY}`, cookie: req.headers.cookie || "" } },
        );
        if (authRes.ok) {
          profileFromAuth = await authRes.json().catch(() => null);
        }
      } catch {}
    }
    if (!localUser && !profileFromAuth) return res.status(404).json({ error: 'User not found' });
    const localProfile = localUser?.profile || {};
    const mergedProfile = {
      username: queryUser,
      displayName: localProfile.displayName || profileFromAuth?.displayName || queryUser,
      avatarUrl: localProfile.avatarUrl || '',
      bio: localProfile.bio || profileFromAuth?.bio || '',
      bannerUrl: localProfile.bannerUrl || '',
      pronouns: localProfile.pronouns || profileFromAuth?.pronouns || '',
      website: localProfile.website || profileFromAuth?.website || '',
      location: localProfile.location || profileFromAuth?.location || '',
    };
    return res.status(200).json(mergedProfile);
  }

  if (req.method === 'POST') {
    if (!isExemptUsername(username)) {
      const ip = getClientIp(req);
      const limit = rateLimit(`profile:${username || ip}`, 10, 60_000);
      if (!limit.allowed) return res.status(429).json({ error: 'Too many profile updates. Try again later.' });
    }
    const { displayName, avatarUrl, bio, bannerUrl, pronouns, website, location } = req.body || {};
    const user = ensureLocalUser(username);
    user.profile = user.profile || {};
    if (typeof displayName === 'string') user.profile.displayName = displayName;
    if (typeof avatarUrl === 'string') user.profile.avatarUrl = avatarUrl;
    if (typeof bio === 'string') user.profile.bio = bio;
    if (typeof bannerUrl === 'string') user.profile.bannerUrl = bannerUrl;
    if (typeof pronouns === 'string') user.profile.pronouns = pronouns;
    if (typeof website === 'string') user.profile.website = website;
    if (typeof location === 'string') user.profile.location = location;
    writeUsers(usersData);

    const syncToChitterSync = req.body?.syncToChitterSync === true;
    let syncError: string | null = null;
    if (syncToChitterSync && isCentralAccount && hasAuthService) {
      try {
        const authRes = await fetch(`${AUTH_SERVICE_BASE}/api/service/profile`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${AUTH_SERVICE_KEY}`,
            cookie: req.headers.cookie || "",
          },
          body: JSON.stringify({
            username,
            profile: { displayName, bio, pronouns, website, location },
          }),
        });
        if (!authRes.ok) syncError = "Profile saved in ChitterHaven, but cloud sync is temporarily unavailable.";
      } catch {
        syncError = "Profile saved in ChitterHaven, but cloud sync is temporarily unavailable.";
      }
    }

    return res.status(200).json({ success: true, syncError });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
