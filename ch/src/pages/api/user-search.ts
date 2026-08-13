import type { NextApiRequest, NextApiResponse } from "next";
import { readUsers } from "@/server/api-lib/usersStore";
import { requireUser } from "@/server/api-lib/auth";

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const user = await requireUser(req, res);
  if (!user) return;
  const me = user.username;

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
