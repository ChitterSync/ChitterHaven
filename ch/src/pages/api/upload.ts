import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { requireUser } from "@/server/api-lib/auth";
import { getClientIp, isExemptUsername, rateLimit } from "@/server/api-lib/rateLimit";
import { canAccessRoom } from "@/server/api-lib/roomAuthorization";

export const config = {
  api: {
    bodyParser: {
      // Base64 expands ~33%; allow headroom above 25MB
      sizeLimit: "40mb",
    },
  },
};

const MAX_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"],
  ["text/plain", ".txt"],
  ["audio/mpeg", ".mp3"],
  ["audio/wav", ".wav"],
  ["audio/ogg", ".ogg"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
]);

const matchesSignature = (buf: Buffer, mime: string) => {
  if (mime === "image/jpeg") return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === "image/png") return buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/gif") return buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a";
  if (mime === "image/webp") return buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  if (mime === "application/pdf") return buf.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mime === "video/mp4") return buf.length >= 12 && buf.subarray(4, 8).toString("ascii") === "ftyp";
  if (mime === "video/webm") return buf.length >= 4 && buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (mime === "audio/ogg") return buf.subarray(0, 4).toString("ascii") === "OggS";
  if (mime === "audio/mpeg") return buf.subarray(0, 3).toString("ascii") === "ID3" || (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
  if (mime === "audio/wav") return buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WAVE";
  if (mime === "text/plain") return !buf.subarray(0, Math.min(buf.length, 4096)).includes(0);
  return false;
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const user = await requireUser(req, res);
  if (!user) return;
  const username = user.username;
  if (!isExemptUsername(username)) {
    const ip = getClientIp(req);
    const limit = rateLimit(`upload:${username || ip}`, 10, 60_000);
    if (!limit.allowed) {
      return res.status(429).json({ error: "Too many uploads. Try again later." });
    }
  }
  const { name, data, type, room } = req.body || {};
  if (!name || !data) return res.status(400).json({ error: "Missing name or data" });
  const conversationRoom = typeof room === "string" && room.trim() ? room.trim() : null;
  if (conversationRoom && !(await canAccessRoom(conversationRoom, username, "upload_files"))) {
    return res.status(403).json({ error: "You cannot upload to this conversation" });
  }

  // Accept data URLs or raw base64
  let base64 = String(data);
  const m = /^data:([^;]+);base64,(.*)$/.exec(base64);
  let mime = type as string | undefined;
  if (m) { mime = m[1]; base64 = m[2]; }
  mime = typeof mime === "string" ? mime.toLowerCase().trim() : undefined;
  if (!mime || !ALLOWED_MIME_TYPES.has(mime)) return res.status(415).json({ error: "Unsupported file type" });
  if (!/^[a-zA-Z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 !== 0) {
    return res.status(400).json({ error: "Invalid file encoding" });
  }

  // compute size
  const sizeBytes = Math.floor(base64.length * 3 / 4) - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if (sizeBytes > MAX_BYTES) return res.status(413).json({ error: "File too large (max 25MB)" });

  const buf = Buffer.from(base64, 'base64');
  if (buf.length === 0 || buf.length !== sizeBytes) return res.status(400).json({ error: "Invalid file data" });
  if (!matchesSignature(buf, mime)) return res.status(415).json({ error: "File contents do not match the declared type" });
  const uploadsDir = path.join(process.cwd(), 'data', 'protected-uploads');
  ensureDir(uploadsDir);
  const safeName = String(name).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-100);
  const id = crypto.randomUUID();
  const ext = ALLOWED_MIME_TYPES.get(mime) || "";
  const filePath = path.join(uploadsDir, id);
  const metadataPath = path.join(uploadsDir, `${id}.json`);
  fs.writeFileSync(filePath, buf, { mode: 0o600, flag: "wx" });
  fs.writeFileSync(metadataPath, JSON.stringify({ id, owner: username, room: conversationRoom, name: safeName, type: mime, size: sizeBytes, createdAt: Date.now() }), { mode: 0o600, flag: "wx" });
  const url = `/api/attachments/${id}`;
  return res.status(200).json({ url, name: safeName, type: mime || undefined, size: sizeBytes });
}
