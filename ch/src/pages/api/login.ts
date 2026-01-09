import type { NextApiRequest, NextApiResponse } from "next";
import { signJWT } from "./jwt";
import crypto from "crypto";
import { readUsers, writeUsers } from "./_lib/usersStore";
import { generateSalt, hashPasswordPbkdf2, hashPasswordScrypt, timingSafeEqualBase64 } from "./_lib/passwords";
import { setAuthCookie } from "./_lib/authCookie";

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
  const usersData = readUsers();
  const user = usersData.users.find((u) => u.username === username);
  if (user) {
    const inferredAlgo =
      user.passwordAlgo ||
      (user.passwordHash && user.passwordHash.length > 60 ? "scrypt" : "pbkdf2");
    if (user.passwordHash && user.passwordSalt && inferredAlgo === "scrypt") {
      const hash = hashPasswordScrypt(password, user.passwordSalt);
      if (!timingSafeEqualBase64(hash, user.passwordHash)) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
    } else if (user.passwordHash && user.passwordSalt && inferredAlgo === "pbkdf2") {
      const hash = hashPasswordPbkdf2(password, user.passwordSalt);
      if (!timingSafeEqualBase64(hash, user.passwordHash)) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const upgradeSalt = generateSalt();
      user.passwordHash = hashPasswordScrypt(password, upgradeSalt);
      user.passwordSalt = upgradeSalt;
      user.passwordAlgo = "scrypt";
      writeUsers(usersData);
    } else if (user.password) {
      const left = Buffer.from(password);
      const right = Buffer.from(user.password);
      if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const upgradeSalt = generateSalt();
      user.passwordHash = hashPasswordScrypt(password, upgradeSalt);
      user.passwordSalt = upgradeSalt;
      user.passwordAlgo = "scrypt";
      delete user.password;
      writeUsers(usersData);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    // Create JWT and set as HTTP-only cookie
    const token = signJWT({ username: user.username });
    setAuthCookie(res, token);
    res.status(200).json({ success: true, username });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
}
