import type { NextApiRequest, NextApiResponse } from "next";
import { clearAuthCookie } from "@/server/api-lib/authCookie";

// --- handler (the main event).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Clear the auth cookie
  clearAuthCookie(res);

  res.status(200).json({ success: true });
}

