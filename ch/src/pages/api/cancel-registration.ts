import type { NextApiRequest, NextApiResponse } from "next";
import { clearAuthCookie, getAuthCookie } from "@/server/api-lib/authCookie";
import { verifyJWT } from "@/server/api-lib/jwt";
import { readUsers, writeUsers } from "@/server/api-lib/usersStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = getAuthCookie(req);
  const payload = token ? verifyJWT(token) : null;
  const username = payload && typeof payload !== "string" ? payload.username : null;
  const setupSession = payload && typeof payload !== "string" && payload.accountSetup === true;
  if (!username || !setupSession) return res.status(403).json({ error: "Registration cancellation is no longer available for this account." });

  const usersData = readUsers();
  const userIndex = usersData.users.findIndex((user) => user.username === username);
  if (userIndex < 0) return res.status(404).json({ error: "Account not found" });

  usersData.users.splice(userIndex, 1);
  writeUsers(usersData);
  clearAuthCookie(res);
  return res.status(200).json({ success: true });
}
