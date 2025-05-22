
import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const HISTORY_PATH = path.join(process.cwd(), "src/pages/api/history.json");
const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();

function decryptHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return {};
  const encrypted = fs.readFileSync(HISTORY_PATH);
  if (encrypted.length <= 16) return {};
  const iv = encrypted.slice(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted.slice(16)),
    decipher.final()
  ]).toString();
  try {
    return JSON.parse(decrypted);
  } catch {
    return {};
  }
}

// Message type for modularity
export type Message = {
  id: string;
  user: string;
  text: string;
  timestamp: number;
  edited?: boolean;
};

function encryptHistory(data: Record<string, Message[]>) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data)),
    cipher.final()
  ]);
  // Write with restrictive permissions (owner read/write only)
  fs.writeFileSync(HISTORY_PATH, Buffer.concat([iv, encrypted]), { mode: 0o600 });
}

function getHistory(room: string): Message[] {
  const data = decryptHistory();
  return data[room] || [];
}

function saveMessage(room: string, msg: { user: string; text: string }) {
  const data: Record<string, Message[]> = decryptHistory();
  if (!data[room]) data[room] = [];
  const message: Message = {
    id: crypto.randomUUID(),
    user: msg.user,
    text: msg.text,
    timestamp: Date.now(),
  };
  data[room].push(message);
  encryptHistory(data);
  return message;
}

function deleteMessage(room: string, messageId: string): boolean {
  const data: Record<string, Message[]> = decryptHistory();
  if (!data[room]) return false;
  const idx = data[room].findIndex((m) => m.id === messageId);
  if (idx === -1) return false;
  data[room].splice(idx, 1);
  encryptHistory(data);
  return true;
}

function editMessage(room: string, messageId: string, newText: string): Message | null {
  const data: Record<string, Message[]> = decryptHistory();
  if (!data[room]) return null;
  const msg = data[room].find((m) => m.id === messageId);
  if (!msg) return null;
  msg.text = newText;
  msg.edited = true;
  encryptHistory(data);
  return msg;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const { room } = req.query;
    res.status(200).json({ messages: getHistory(room as string) });
    return;
  }
  if (req.method === "POST") {
    const { room, msg, action, messageId, newText } = req.body;
    if (action === "delete") {
      const ok = deleteMessage(room, messageId);
      res.status(ok ? 200 : 404).json({ success: ok });
      return;
    }
    if (action === "edit") {
      const edited = editMessage(room, messageId, newText);
      if (edited) {
        res.status(200).json({ success: true, message: edited });
      } else {
        res.status(404).json({ success: false });
      }
      return;
    }
    // Default: add message
    const message = saveMessage(room, msg);
    res.status(200).json({ success: true, message });
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
}
