import type { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "@/server/api-lib/jwt";
import { readUsers } from "@/server/api-lib/usersStore";
import { getAuthCookie } from "@/server/api-lib/authCookie";

// --- handler (the main event).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const token = getAuthCookie(req);
  const payload: any = token ? verifyJWT(token) : null;
  const me = payload?.username;
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const q = String((req.query.q || "")).trim().toLowerCase();
  const listAll = String(req.query.all || "").toLowerCase() === 'true';

  const data = readUsers();
  const arr = listAll && !q ? data.users : data.users.filter(u => u.username.toLowerCase().includes(q) || (u.profile?.displayName || "").toLowerCase().includes(q));
  const results = arr
    .filter(u => u.username !== me)
    .slice(0, listAll && !q ? 100 : 10)
    .map(u => ({ username: u.username, displayName: u.profile?.displayName || u.username, avatarUrl: u.profile?.avatarUrl || "" }));
  return res.status(200).json({ results });
}
