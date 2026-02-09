import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { readSessionFromRequest } from "@/lib/auth/session";
import { getAuthCookie } from "./_lib/authCookie";
import { verifyJWT } from "./jwt";
import { getClientIp, isExemptUsername, rateLimit } from "./_lib/rateLimit";

export const config = {
  api: {
    bodyParser: {
      // Base64 expands ~33%; allow headroom above 25MB
      sizeLimit: "40mb",
    },
  },
};

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const session = readSessionFromRequest(req);
  const token = getAuthCookie(req);
  const payload: any = token ? verifyJWT(token) : null;
  const username = session?.user?.username || payload?.username;
  if (!isExemptUsername(username)) {
    const ip = getClientIp(req);
    const limit = rateLimit(`upload:${username || ip}`, 10, 60_000);
    if (!limit.allowed) {
      return res.status(429).json({ error: "Too many uploads. Try again later." });
    }
  }
  const { name, data, type } = req.body || {};
  if (!name || !data) return res.status(400).json({ error: "Missing name or data" });

  // Accept data URLs or raw base64
  let base64 = String(data);
  const m = /^data:([^;]+);base64,(.*)$/.exec(base64);
  let mime = type as string | undefined;
  if (m) { mime = m[1]; base64 = m[2]; }

  // compute size
  const sizeBytes = Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if (sizeBytes > MAX_BYTES) return res.status(413).json({ error: "File too large (max 25MB)" });

  const buf = Buffer.from(base64, 'base64');
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  ensureDir(uploadsDir);
  const safeName = String(name).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-100);
  const id = crypto.randomUUID();
  const ext = path.extname(safeName) || (mime ? `.${mime.split('/')[1]}` : '');
  const fileName = `${id}${ext}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buf);
  const url = `/uploads/${fileName}`;
  return res.status(200).json({ url, name: safeName, type: mime || undefined, size: sizeBytes });
}
