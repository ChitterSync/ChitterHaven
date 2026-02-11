import type { NextApiRequest, NextApiResponse } from "next";
import { signJWT } from "@/server/api-lib/jwt";
import { readUsers, writeUsers } from "@/server/api-lib/usersStore";
import { generateSalt, hashPasswordScrypt } from "@/server/api-lib/passwords";
import { setAuthCookie } from "@/server/api-lib/authCookie";
import { getClientIp, isExemptUsername, rateLimit } from "@/server/api-lib/rateLimit";

// --- handler (the main event).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { username, password } = req.body || {};
  if (!username || !password) {
    res.status(400).json({ error: "Missing username or password" });
    return;
  }
  if (!isExemptUsername(username)) {
    const ip = getClientIp(req);
    const limit = rateLimit(`register:${ip}`, 3, 60_000);
    if (!limit.allowed) {
      res.status(429).json({ error: "Too many registrations. Try again later." });
      return;
    }
  }
  const usersData = readUsers();
  if (usersData.users.find((u) => u.username === username)) {
    res.status(409).json({ error: "Username already exists" });
    return;
  }
  const passwordSalt = generateSalt();
  const passwordHash = hashPasswordScrypt(password, passwordSalt);
  usersData.users.push({ username, passwordHash, passwordSalt, passwordAlgo: "scrypt", profile: { displayName: username }, roles: ["member"] });
  writeUsers(usersData);
  // Create JWT and set as HTTP-only cookie
  const token = signJWT({ username });
  setAuthCookie(res, token);
  res.status(200).json({ success: true, username });
}
