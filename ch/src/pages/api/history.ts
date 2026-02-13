import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { prisma } from "@/server/api-lib/prismaClient";
import { requireUser } from "@/server/api-lib/auth";
import { getClientIp, isExemptUsername, rateLimit } from "@/server/api-lib/rateLimit";

const HISTORY_PATH = path.join(process.cwd(), "src/pages/api/history.json");
const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();

function decryptHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return {};
  const encrypted = fs.readFileSync(HISTORY_PATH);
  if (encrypted.length <= 16) return {};
  const iv = encrypted.slice(0, 16);
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted.slice(16)),
      decipher.final()
    ]).toString();
    return JSON.parse(decrypted);
  } catch {
    // Fallback: file might be plaintext JSON or encrypted with an old key.
    try {
      const plaintext = encrypted.toString("utf8");
      const parsed = JSON.parse(plaintext);
      // Re-encrypt to the current key if plaintext was valid.
      encryptHistory(parsed);
      return parsed;
    } catch {
      return {};
    }
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
  poll?: {
    type?: "choice" | "dropdown" | "slider" | "text" | "star" | "user_select";
    question: string;
    options: { id: string; text: string; votes: string[]; voteCount?: number }[];
    multiple?: boolean;
    maxSelections?: number;
    allowVoteChange?: boolean;
    showDemographics?: boolean;
    anonymous?: boolean;
    closesAt?: number | null;
    createdBy?: string;
    textMaxLength?: number;
    textResponses?: { user: string; text: string; timestamp: number }[];
    starScale?: number;
    ratings?: { user: string; value: number; timestamp: number }[];
    userSelectArgs?: {
      onlineOnly?: boolean;
      includeSelf?: boolean;
      maxSelections?: number;
      source?: "haven" | "dm";
    };
    sliderArgs?: {
      layout?: "single" | "wrap";
      compact?: boolean;
    };
    viewerSelection?: string[];
    viewerRating?: number;
    viewerTextSubmitted?: boolean;
    ratingAverage?: number;
    ratingCount?: number;
    textResponseCount?: number;
  };
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

function saveMessage(
  room: string,
  msg: {
    user: string;
    text: string;
    replyToId?: string | null;
    attachments?: Message["attachments"];
    systemType?: string;
    poll?: Message["poll"];
  },
) {
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
    poll: msg.poll,
  };
  data[room].push(message);
  encryptHistory(data);
  return message;
}

function buildPoll(raw: any, createdBy: string): Message["poll"] | null {
  if (!raw || typeof raw !== "object") return null;
  const pollType =
    raw.type === "dropdown" ||
    raw.type === "slider" ||
    raw.type === "text" ||
    raw.type === "star" ||
    raw.type === "user_select"
      ? raw.type
      : "choice";
  const question = typeof raw.question === "string" ? raw.question.trim().slice(0, 240) : "";
  if (!question) return null;
  const requireOptions = pollType === "choice" || pollType === "dropdown" || pollType === "slider" || pollType === "user_select";
  const optionValues = Array.isArray(raw.options) ? raw.options : [];
  const deduped: string[] = [];
  if (requireOptions) {
    const normalized = optionValues
      .map((value: unknown) => (typeof value === "string" ? value.trim().slice(0, 80) : ""))
      .filter((value: string) => value.length > 0)
      .slice(0, 50);
    const seen = new Set<string>();
    for (const option of normalized) {
      const key = option.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(option);
    }
    if (deduped.length < 2) return null;
  }
  const closesAtRaw = Number(raw.closesAt);
  const closesAt = Number.isFinite(closesAtRaw) && closesAtRaw > Date.now() ? Math.floor(closesAtRaw) : null;
  const multiple = raw.multiple === true && (pollType === "choice" || pollType === "user_select");
  const maxSelRaw = Number(raw.maxSelections);
  const maxSelections = Number.isFinite(maxSelRaw) ? Math.max(1, Math.min(10, Math.floor(maxSelRaw))) : undefined;
  const textMaxLengthRaw = Number(raw.textMaxLength);
  const textMaxLength =
    pollType === "text" && Number.isFinite(textMaxLengthRaw)
      ? Math.max(20, Math.min(500, Math.floor(textMaxLengthRaw)))
      : (pollType === "text" ? 280 : undefined);
  const starScaleRaw = Number(raw.starScale);
  const starScale =
    pollType === "star" && Number.isFinite(starScaleRaw)
      ? Math.max(3, Math.min(10, Math.floor(starScaleRaw)))
      : (pollType === "star" ? 5 : undefined);
  const userArgs: {
    onlineOnly?: boolean;
    includeSelf?: boolean;
    maxSelections?: number;
    source?: "haven" | "dm";
  } | undefined = pollType === "user_select"
    ? {
        onlineOnly: raw.userSelectArgs?.onlineOnly === true,
        includeSelf: raw.userSelectArgs?.includeSelf === true,
        maxSelections: Number.isFinite(Number(raw.userSelectArgs?.maxSelections))
          ? Math.max(1, Math.min(10, Math.floor(Number(raw.userSelectArgs?.maxSelections))))
          : (maxSelections || 1),
        source: (raw.userSelectArgs?.source === "dm" ? "dm" : "haven") as "haven" | "dm",
      }
    : undefined;
  const sliderArgs:
    | {
        layout?: "single" | "wrap";
        compact?: boolean;
      }
    | undefined = pollType === "slider"
    ? {
        layout: raw.sliderArgs?.layout === "wrap" ? "wrap" : "single",
        compact: raw.sliderArgs?.compact === true,
      }
    : undefined;
  return {
    type: pollType,
    question,
    options: deduped.map((text) => ({ id: crypto.randomUUID(), text, votes: [] })),
    multiple,
    maxSelections: maxSelections || (multiple ? 2 : 1),
    allowVoteChange: raw.allowVoteChange !== false,
    showDemographics: raw.showDemographics !== false,
    anonymous: raw.anonymous === true,
    closesAt,
    createdBy,
    textMaxLength,
    textResponses: pollType === "text" ? [] : undefined,
    starScale,
    ratings: pollType === "star" ? [] : undefined,
    userSelectArgs: userArgs,
    sliderArgs,
  };
}

function sanitizeMessageForUser(message: Message, viewer: string): Message {
  if (!message?.poll) return message;
  const poll = message.poll;
  const anonymous = poll.anonymous === true;
  const pollType = poll.type || "choice";
  const options = Array.isArray(poll.options) ? poll.options : [];
  const sanitizedOptions: Array<{ id: string; text: string; votes: string[]; voteCount?: number }> = options.map((option) => {
    const votes = Array.isArray(option.votes) ? option.votes : [];
    return anonymous
      ? { ...option, votes: [], voteCount: votes.length }
      : { ...option };
  });
  const viewerSelection = options.filter((option) => (option.votes || []).includes(viewer)).map((option) => option.id);
  const ratings = Array.isArray(poll.ratings) ? poll.ratings.filter((entry) => entry && typeof entry.user === "string") : [];
  const textResponses = Array.isArray(poll.textResponses) ? poll.textResponses.filter((entry) => entry && typeof entry.user === "string") : [];
  const viewerRating = ratings.find((entry) => entry.user === viewer)?.value;
  const viewerTextSubmitted = textResponses.some((entry) => entry.user === viewer);
  const ratingAverage = ratings.length
    ? Number((ratings.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0) / ratings.length).toFixed(2))
    : undefined;
  const ratingCount = ratings.length || undefined;
  const textResponseCount = textResponses.length || undefined;
  const sanitizedPoll: NonNullable<Message["poll"]> = {
    ...poll,
    type: pollType,
    options: sanitizedOptions,
    viewerSelection,
    viewerRating,
    viewerTextSubmitted,
    ratingAverage,
    ratingCount,
    textResponseCount,
    ratings: anonymous ? [] : ratings,
    textResponses: anonymous ? [] : textResponses,
  };
  return { ...message, poll: sanitizedPoll };
}

function votePoll(room: string, messageId: string, payload: any, user: string): { message: Message | null; error?: string } {
  const data: Record<string, Message[]> = decryptHistory();
  if (!data[room]) return { message: null, error: "Room not found" };
  const msg = data[room].find((m) => m.id === messageId);
  if (!msg || !msg.poll || !Array.isArray(msg.poll.options)) return { message: null, error: "Poll not found" };
  const poll = msg.poll;
  const pollType = poll.type || "choice";
  if (poll.closesAt && Date.now() > poll.closesAt) return { message: null, error: "This poll is closed." };
  const allowVoteChange = poll.allowVoteChange !== false;

  if (pollType === "text") {
    const textMaxLength = Math.max(20, Math.min(500, Number(poll.textMaxLength || 280)));
    const nextText = typeof payload?.text === "string" ? payload.text.trim().slice(0, textMaxLength) : "";
    if (!nextText) return { message: null, error: "Response text is required." };
    poll.textResponses = Array.isArray(poll.textResponses) ? poll.textResponses.filter((entry) => entry && typeof entry.user === "string") : [];
    const existing = poll.textResponses.find((entry) => entry.user === user);
    if (!allowVoteChange && existing && existing.text !== nextText) {
      return { message: null, error: "This poll does not allow response changes." };
    }
    if (existing) {
      existing.text = nextText;
      existing.timestamp = Date.now();
    } else {
      poll.textResponses.push({ user, text: nextText, timestamp: Date.now() });
    }
    encryptHistory(data);
    return { message: msg };
  }

  if (pollType === "star") {
    const scale = Math.max(3, Math.min(10, Number(poll.starScale || 5)));
    const rating = Number(payload?.rating);
    if (!Number.isFinite(rating)) return { message: null, error: "Rating is required." };
    const nextRating = Math.max(1, Math.min(scale, Math.floor(rating)));
    poll.ratings = Array.isArray(poll.ratings) ? poll.ratings.filter((entry) => entry && typeof entry.user === "string") : [];
    const existing = poll.ratings.find((entry) => entry.user === user);
    if (!allowVoteChange && existing && existing.value !== nextRating) {
      return { message: null, error: "This poll does not allow rating changes." };
    }
    if (existing) {
      existing.value = nextRating;
      existing.timestamp = Date.now();
    } else {
      poll.ratings.push({ user, value: nextRating, timestamp: Date.now() });
    }
    encryptHistory(data);
    return { message: msg };
  }

  const options = poll.options;
  options.forEach((option) => {
    option.votes = Array.isArray(option.votes) ? option.votes.filter((entry) => typeof entry === "string") : [];
  });

  const rawIds = Array.isArray(payload?.optionIds)
    ? payload.optionIds
    : (payload?.optionId ? [payload.optionId] : []);
  const nextIds: string[] = Array.from(
    new Set(
      rawIds
        .filter((entry: unknown): entry is string => typeof entry === "string")
        .map((entry: string) => entry.trim())
        .filter((entry: string) => Boolean(entry)),
    ),
  );
  if (nextIds.length === 0) return { message: null, error: "Option is required." };
  const validIds = new Set(options.map((option) => option.id));
  const invalid = nextIds.find((id) => !validIds.has(id));
  if (invalid) return { message: null, error: "Option not found." };
  const currentIds = options.filter((option) => option.votes.includes(user)).map((option) => option.id);
  const currentSet = new Set(currentIds);
  const nextSet = new Set(nextIds);
  const isSameSelection =
    currentIds.length === nextIds.length && currentIds.every((id) => nextSet.has(id));
  if (isSameSelection) {
    return { message: msg };
  }
  if (!allowVoteChange && currentIds.length > 0 && !isSameSelection) {
    return { message: null, error: "This poll does not allow vote changes." };
  }

  if (pollType === "dropdown" || pollType === "slider" || (!poll.multiple && pollType !== "user_select")) {
    const id = nextIds[0];
    options.forEach((option) => {
      option.votes = option.votes.filter((entry) => entry !== user);
    });
    const target = options.find((option) => option.id === id);
    if (target && !currentSet.has(id)) target.votes.push(user);
    encryptHistory(data);
    return { message: msg };
  }

  const maxSelections =
    pollType === "user_select"
      ? Math.max(1, Math.min(10, Number(poll.userSelectArgs?.maxSelections || poll.maxSelections || 1)))
      : Math.max(1, Math.min(10, Number(poll.maxSelections || 10)));
  if (nextIds.length > maxSelections) {
    return { message: null, error: `You can select up to ${maxSelections} options.` };
  }
  options.forEach((option) => {
    option.votes = option.votes.filter((entry) => entry !== user);
    if (nextSet.has(option.id)) {
      option.votes.push(user);
    }
  });
  encryptHistory(data);
  return { message: msg };
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
    const me = payload.username as string;
    const messages = getHistory(room as string).map((message) => sanitizeMessageForUser(message, me));
    res.status(200).json({ messages });
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
    if (!isExemptUsername(me)) {
      const ip = getClientIp(req);
      const limit = rateLimit(`history:${me || ip}`, 60, 60_000);
      if (!limit.allowed) {
        return res.status(429).json({ error: "Too many messages. Try again shortly." });
      }
    }

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
        res.status(200).json({ success: true, message: sanitizeMessageForUser(edited, me) });
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
        res.status(200).json({ success: true, message: sanitizeMessageForUser(updated, me) });
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
        res.status(200).json({ success: true, message: sanitizeMessageForUser(updated, me) });
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
    if (action === "create_poll") {
      const poll = buildPoll(msg?.poll, me);
      if (!poll) {
        return res.status(400).json({ success: false, error: "Poll requires a question and at least 2 options." });
      }
      const message = saveMessage(room, {
        user: me,
        text: typeof msg?.text === "string" ? msg.text.slice(0, 500) : "",
        poll,
      });
      return res.status(200).json({ success: true, message: sanitizeMessageForUser(message, me) });
    }
    if (action === "poll_vote") {
      if (!messageId || typeof messageId !== "string") {
        return res.status(400).json({ success: false, error: "messageId is required." });
      }
      const result = votePoll(room, messageId, req.body, me);
      if (!result.message) {
        return res.status(400).json({ success: false, error: result.error || "Vote failed." });
      }
      return res.status(200).json({ success: true, message: sanitizeMessageForUser(result.message, me) });
    }
    // Default: add message
    const message = saveMessage(room, { ...msg, user: me });
    res.status(200).json({ success: true, message: sanitizeMessageForUser(message, me) });
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
}
