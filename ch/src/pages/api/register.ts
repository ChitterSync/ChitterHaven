import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import { signJWT } from "./jwt";
import cookie from "cookie";
import crypto from "crypto";

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
  const usersPath = path.join(process.cwd(), "src/pages/api/users.json");
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
  let usersData: UsersData = { users: [] };
  if (fs.existsSync(usersPath)) {
    const encrypted = fs.readFileSync(usersPath);
    if (encrypted.length > 16) {
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, encrypted.slice(0, 16));
      const decrypted = Buffer.concat([
        decipher.update(encrypted.slice(16)),
        decipher.final()
      ]).toString();
      usersData = JSON.parse(decrypted);
    }
  }
  if (usersData.users.find((u) => u.username === username)) {
    res.status(409).json({ error: "Username already exists" });
    return;
  }
  usersData.users.push({ username, password, profile: { displayName: username }, roles: ["member"] });
  // Encrypt and save
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(usersData)),
    cipher.final()
  ]);
  // Write with restrictive permissions (owner read/write only)
  fs.writeFileSync(usersPath, Buffer.concat([iv, encrypted]), { mode: 0o600 });
  // Create JWT and set as HTTP-only cookie
  const token = signJWT({ username });
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
}
