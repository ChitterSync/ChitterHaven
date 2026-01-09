import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { prisma } from "./prismaClient";
import { requireUser } from "./auth";

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
  replyToId?: string | null;
  reactions?: { [emoji: string]: string[] };
  pinned?: boolean;
  attachments?: { url: string; name: string; type?: string; size?: number }[];
  editHistory?: { text: string; timestamp: number }[];
  systemType?: string;
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
  const data = decryptHistory() as Record<string, Message[]>;
  const arr = data[room] || [];
  // Deduplicate by id while preserving first occurrence
  const seen = new Set<string>();
  const deduped: Message[] = [];
  for (const m of arr) {
    if (!m || !m.id) continue;
    if (!seen.has(m.id)) { seen.add(m.id); deduped.push(m); }
  }
  // Optionally persist back if duplicates were removed
  if (deduped.length !== arr.length) {
    data[room] = deduped;
    encryptHistory(data);
  }
  return deduped;
}

function saveMessage(room: string, msg: { user: string; text: string; replyToId?: string | null; attachments?: Message["attachments"]; systemType?: string }) {
  const data: Record<string, Message[]> = decryptHistory();
  if (!data[room]) data[room] = [];
  // If this is a call-summary, ensure we only ever have one summary message in the room
  if (msg.systemType === 'call-summary') {
    const existing = (data[room] || []).find(m => m && m.systemType === 'call-summary');
    if (existing) {
      // Return existing message instead of adding a duplicate
      return existing;
    }
  }
  const message: Message = {
    id: crypto.randomUUID(),
    user: msg.user,
    text: msg.text,
    timestamp: Date.now(),
    replyToId: msg.replyToId || null,
    reactions: {},
    pinned: false,
    attachments: msg.attachments || [],
    editHistory: [],
    systemType: msg.systemType,
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
  // push previous version
  msg.editHistory = msg.editHistory || [];
  msg.editHistory.push({ text: msg.text, timestamp: Date.now() });
  msg.text = newText;
  msg.edited = true;
  encryptHistory(data);
  return msg;
}

function reactMessage(room: string, messageId: string, emoji: string, user: string): Message | null {
  const data: Record<string, Message[]> = decryptHistory();
  if (!data[room]) return null;
  const msg = data[room].find((m) => m.id === messageId);
  if (!msg) return null;
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  const users = msg.reactions[emoji];
  const idx = users.indexOf(user);
  if (idx >= 0) {
    users.splice(idx, 1);
    if (users.length === 0) delete msg.reactions[emoji];
  } else {
    users.push(user);
  }
  encryptHistory(data);
  return msg;
}

function pinMessage(room: string, messageId: string, pin: boolean): Message | null {
  const data: Record<string, Message[]> = decryptHistory();
  if (!data[room]) return null;
  const msg = data[room].find((m) => m.id === messageId);
  if (!msg) return null;
  msg.pinned = !!pin;
  encryptHistory(data);
  return msg;
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const payload = await requireUser(req, res);
    if (!payload) return;
    const { room } = req.query;
    res.status(200).json({ messages: getHistory(room as string) });
    return;
  }
  if (req.method === "POST") {
    const { room, msg, action, messageId, newText, emoji, user, pin } = req.body;

    // Permission helpers (channel rooms only: HAVEN__CHANNEL)
    const isChannelRoom = typeof room === 'string' && room.includes('__');
    const haven = isChannelRoom ? String(room).split('__')[0] : null;

    // Authenticated username (required)
    const payload = await requireUser(req, res);
    if (!payload) return;
    const me = payload.username as string;

    const ensurePermissions = async (havenName: string) => {
      // Load server settings via Prisma and ensure a default permissions scaffold exists
      try {
        const setting = await prisma.serverSetting.findUnique({ where: { key: havenName } });
        let value: any = setting ? JSON.parse(setting.value) : {};
        if (!value.permissions) {
          value.permissions = {
            roles: {
              Owner: ['*'],
              Admin: ['manage_server','manage_roles','manage_channels','manage_messages','pin_messages','send_messages','add_reactions','upload_files','view_channels'],
              Moderator: ['manage_messages','pin_messages','send_messages','add_reactions','upload_files','view_channels'],
              Member: ['send_messages','add_reactions','upload_files','view_channels'],
              Guest: ['view_channels']
            },
            members: {},
            defaults: { everyone: ['send_messages','add_reactions','view_channels'] }
          };
          // Bootstrap owner for default haven if requested
          if (havenName === 'ChitterHaven') {
            value.permissions.members['speed_devil50'] = ['Owner'];
          }
          await prisma.serverSetting.upsert({ where: { key: havenName }, update: { value: JSON.stringify(value) }, create: { key: havenName, value: JSON.stringify(value) } });
          return value.permissions as any;
        }
        return value.permissions as any;
      } catch {
        return null;
      }
    };
    const checkPerm = async (username: string, havenName: string, perm: string) => {
      const perms = await ensurePermissions(havenName);
      if (!perms) return true; // permissive fallback if settings unavailable
      const rolesMap = perms.roles || {};
      const memberRoles: string[] = (perms.members?.[username] || []) as string[];
      const everyone: string[] = (perms.defaults?.everyone || []) as string[];
      const hasRolePerm = memberRoles.some(r => (rolesMap[r] || []).includes('*') || (rolesMap[r] || []).includes(perm));
      const hasDefault = everyone.includes('*') || everyone.includes(perm);
      return hasRolePerm || hasDefault;
    };
    if (action === "delete") {
      if (isChannelRoom) {
        // allow delete own or manage_messages
        const data: Record<string, Message[]> = decryptHistory();
        const msgArr = data[room] || [];
        const target = msgArr.find(m => m.id === messageId);
        const isOwn = target && target.user === me;
        if (!isOwn) {
          const allowed = await checkPerm(me, haven!, 'manage_messages');
          if (!allowed) return res.status(403).json({ error: 'Forbidden' });
        }
      }
      const ok = deleteMessage(room, messageId);
      res.status(ok ? 200 : 404).json({ success: ok });
      return;
    }
    if (action === "edit") {
      const dataAll: Record<string, Message[]> = decryptHistory();
      const msgArrAll = dataAll[room] || [];
      const targetEdit = msgArrAll.find(m => m.id === messageId);
      if (targetEdit && targetEdit.systemType === 'call-summary') {
        return res.status(403).json({ success: false, error: "Cannot edit call summary messages" });
      }
      if (isChannelRoom) {
        const isOwn = targetEdit && targetEdit.user === me;
        if (!isOwn) {
          const allowed = await checkPerm(me, haven!, 'manage_messages');
          if (!allowed) return res.status(403).json({ error: 'Forbidden' });
        }
      }
      const edited = editMessage(room, messageId, newText);
      if (edited) {
        res.status(200).json({ success: true, message: edited });
      } else {
        res.status(404).json({ success: false });
      }
      return;
    }
    if (action === "react") {
      if (!emoji) {
        res.status(400).json({ success: false, error: "emoji required" });
        return;
      }
      const updated = reactMessage(room, messageId, emoji, me);
      if (updated) {
        res.status(200).json({ success: true, message: updated });
      } else {
        res.status(404).json({ success: false });
      }
      return;
    }
    if (action === "pin") {
      if (isChannelRoom) {
        const allowed = await checkPerm(me, haven!, 'pin_messages');
        if (!allowed) return res.status(403).json({ error: 'Forbidden' });
      }
      const updated = pinMessage(room, messageId, !!pin);
      if (updated) {
        res.status(200).json({ success: true, message: updated });
      } else {
        res.status(404).json({ success: false });
      }
      return;
    }
    if (action === "history") {
      const data: Record<string, Message[]> = decryptHistory();
      const arr = data[room] || [];
      const found = arr.find(m => m.id === messageId);
      if (!found) return res.status(404).json({ success: false });
      return res.status(200).json({ success: true, history: found.editHistory || [] });
    }
    // Default: add message
    const message = saveMessage(room, { ...msg, user: me });
    res.status(200).json({ success: true, message });
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
}
