
import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { signJWT } from "./jwt";
import cookie from "cookie";
import crypto from "crypto";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const key = crypto.createHash("sha256").update(SECRET).digest();

type UserProfile = {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  [key: string]: any;
};
type User = { username: string; password: string; profile?: UserProfile; roles?: string[] };
type UsersData = { users: User[] };

function decryptUsers(): UsersData {
  const usersPath = path.join(process.cwd(), "src/pages/api/users.json");
  if (!fs.existsSync(usersPath)) return { users: [] };
  const encrypted = fs.readFileSync(usersPath);
  if (encrypted.length <= 16) return { users: [] };
  const iv = encrypted.slice(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted.slice(16)),
    decipher.final()
  ]).toString();
  try {
    return JSON.parse(decrypted);
  } catch {
    return { users: [] };
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Missing username or password" });
    return;
  }
  const usersData = decryptUsers();
  const user = usersData.users.find((u) => u.username === username && u.password === password);
  if (user) {
    // Create JWT and set as HTTP-only cookie
    const token = signJWT({ username: user.username });
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("chitter_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7 // 7 days
      })
    );
    res.status(200).json({ success: true, username });
  } else {
    res.status(401).json({ error: "Invalid credentials, We Recently Lost Access to Some Users Data, please make a new account if you suspect you were part of the group that lost their data" });
  }
}
