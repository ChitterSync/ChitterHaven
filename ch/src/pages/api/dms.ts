import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { verifyJWT } from "@/server/api-lib/jwt";
import { getAuthCookie } from "@/server/api-lib/authCookie";
import { readSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, isExemptUsername, rateLimit } from "@/server/api-lib/rateLimit";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const DMS_PATH = path.join(process.cwd(), "src/pages/api/dms.json");
const MAX_GROUP_DM_MEMBERS = 25;
const MAX_GROUP_DM_NAME = 64;
const MAX_GROUP_DM_AVATAR_URL = 2048;

export type DM = {
  id: string;
  users: string[];
  title?: string;
  group?: boolean;
  owner?: string;
  moderators?: string[];
  avatarUrl?: string;
};
type DMData = { dms: DM[] };

const sortStrings = (list: string[]) => list.slice().sort((a, b) => a.localeCompare(b));
const arraysEqual = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every((val, idx) => val === b[idx]);
const sanitizeGroupTitle = (value?: string) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_GROUP_DM_NAME);
};
const sanitizeAvatarUrl = (value?: string) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_GROUP_DM_AVATAR_URL);
};
const normalizeGroupMetadata = (dm: DM, fallbackOwner?: string): { owner?: string; moderators: string[] } => {
  if (!dm.group) return { owner: dm.owner, moderators: dm.moderators || [] };
  const ownerCandidate = dm.owner && dm.users.includes(dm.owner) ? dm.owner : undefined;
  const owner = ownerCandidate || (fallbackOwner && dm.users.includes(fallbackOwner) ? fallbackOwner : dm.users[0]);
  const moderators = Array.from(
    new Set(
      (dm.moderators || [])
        .filter((user): user is string => typeof user === "string")
        .filter((user) => user !== owner && dm.users.includes(user)),
    ),
  ).sort((a, b) => a.localeCompare(b));
  return { owner, moderators };
};
const enforceGroupMetadata = (dm: DM, fallbackOwner?: string) => {
  if (!dm.group) return false;
  const normalized = normalizeGroupMetadata(dm, fallbackOwner);
  const changed = dm.owner !== normalized.owner || !arraysEqual(sortStrings(dm.moderators || []), normalized.moderators);
  if (changed) {
    dm.owner = normalized.owner;
    dm.moderators = normalized.moderators;
  }
  return changed;
};
const presentDM = (dm: DM, fallbackOwner?: string): DM => {
  if (!dm.group) return { ...dm };
  const normalized = normalizeGroupMetadata(dm, fallbackOwner);
  return {
    ...dm,
    owner: normalized.owner,
    moderators: normalized.moderators,
  };
};
const isGroupModerator = (dm: DM, username: string) => {
  if (!dm.group) return false;
  if (dm.owner && dm.owner === username) return true;
  return Array.isArray(dm.moderators) && dm.moderators.includes(username);
};

function readDMs(): DMData {
  if (!fs.existsSync(DMS_PATH)) return { dms: [] };
  const buf = fs.readFileSync(DMS_PATH);
  if (buf.length <= 16) return { dms: [] };
  const iv = buf.slice(0, 16);
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
    const json = Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString();
    return JSON.parse(json);
  } catch {
    try {
      const plaintext = buf.toString("utf8");
      const parsed = JSON.parse(plaintext);
      writeDMs(parsed);
      return parsed;
    } catch {
      return { dms: [] };
    }
  }
}

function writeDMs(data: DMData) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  fs.writeFileSync(DMS_PATH, Buffer.concat([iv, enc]), { mode: 0o600 });
}

export function ensureDMForUsers(a: string, b: string): DM {
  const data = readDMs();
  const pair = sortStrings([a, b]);
  const found = data.dms.find((dm) => dm.users.length === 2 && sortStrings(dm.users).every((u, i) => u === pair[i]));
  if (found) return found;
  const dm: DM = { id: crypto.randomUUID(), users: pair };
  data.dms.push(dm);
  writeDMs(data);
  return dm;
}

function ensureGroupDM(me: string, others: string[], title?: string, avatarUrl?: string): { dm: DM; existed: boolean } {
  const data = readDMs();
  const unique = sortStrings(Array.from(new Set([me, ...others])));
  if (unique.length > MAX_GROUP_DM_MEMBERS) {
    throw new Error(`Group DMs can include up to ${MAX_GROUP_DM_MEMBERS} members.`);
  }
  const found = data.dms.find(dm => {
    const u = sortStrings(dm.users || []);
    if (u.length !== unique.length) return false;
    return u.every((val, idx) => val === unique[idx]);
  });
  if (found) {
    if (enforceGroupMetadata(found, me)) {
      writeDMs(data);
    }
    return { dm: found, existed: true };
  }
  const dm: DM = {
    id: crypto.randomUUID(),
    users: unique,
    title: sanitizeGroupTitle(title),
    group: true,
    owner: me,
    moderators: [],
    avatarUrl: sanitizeAvatarUrl(avatarUrl),
  };
  data.dms.push(dm);
  writeDMs(data);
  return { dm, existed: false };
}

// --- handler (the main event).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = readSessionFromRequest(req);
  const token = getAuthCookie(req);
  const payload: any = token ? verifyJWT(token) : null;
  const me = session?.user?.username || payload?.username;
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const data = readDMs();
    const mine = data.dms
      .filter(dm => dm.users.includes(me))
      .map((dm) => presentDM(dm, me));
    return res.status(200).json({ dms: mine });
  }

  if (req.method === "POST") {
    if (!isExemptUsername(me)) {
      const ip = getClientIp(req);
      const limit = rateLimit(`dms:${me || ip}`, 20, 60_000);
      if (!limit.allowed) {
        return res.status(429).json({ error: "Too many DM actions. Try again later." });
      }
    }
    const { action, target } = req.body || {};
    if (action === "ensure") {
      if (!target || target === me) return res.status(400).json({ error: "Invalid target" });
      const dm = ensureDMForUsers(me, target);
      return res.status(200).json({ success: true, dm });
    }
    if (action === "group") {
      const rawTargets = Array.isArray((req.body as any).targets) ? (req.body as any).targets : [];
      const clean = Array.from(new Set(rawTargets.filter((t: any) => typeof t === "string" && t.trim() && t !== me))) as string[];
      if (clean.length < 2) {
        return res.status(400).json({ error: "Select at least two other users for a group DM" });
      }
      if (clean.length > MAX_GROUP_DM_MEMBERS - 1) {
        return res.status(400).json({ error: `Group DMs can include up to ${MAX_GROUP_DM_MEMBERS - 1} other users (${MAX_GROUP_DM_MEMBERS} total).` });
      }
      const title = typeof (req.body as any).title === "string" ? (req.body as any).title : "";
      const avatarUrl = typeof (req.body as any).avatarUrl === "string" ? (req.body as any).avatarUrl : "";
      try {
        const { dm, existed } = ensureGroupDM(me, clean, title, avatarUrl);
        return res.status(200).json({ success: true, dm: presentDM(dm, me), existed: !!existed });
      } catch (err: any) {
        return res.status(400).json({ error: err?.message || "Could not create group DM" });
      }
    }
    if (action === "group-meta") {
      const dmId = typeof (req.body as any).dmId === "string" ? (req.body as any).dmId : "";
      if (!dmId) return res.status(400).json({ error: "Missing group DM id" });
      const data = readDMs();
      const dm = data.dms.find((entry) => entry.id === dmId);
      if (!dm || !dm.group || !dm.users.includes(me)) return res.status(404).json({ error: "Group DM not found" });
      const normalized = presentDM(dm, me);
      const owner = normalized.owner;
      const isOwner = owner === me;
      const isModerator = isOwner || (normalized.moderators || []).includes(me);
      if (!isModerator) return res.status(403).json({ error: "Insufficient permissions" });
      let changed = false;
      if (Object.prototype.hasOwnProperty.call(req.body, "title")) {
        const nextTitle = sanitizeGroupTitle((req.body as any).title);
        if (nextTitle !== dm.title) {
          dm.title = nextTitle;
          changed = true;
        }
      }
      if (Object.prototype.hasOwnProperty.call(req.body, "avatarUrl")) {
        const nextAvatar = sanitizeAvatarUrl((req.body as any).avatarUrl);
        if (nextAvatar !== dm.avatarUrl) {
          dm.avatarUrl = nextAvatar;
          changed = true;
        }
      }
      if (Object.prototype.hasOwnProperty.call(req.body, "moderators")) {
          if (!isOwner) {
            return res.status(403).json({ error: "Only the owner can manage moderators." });
          }
          const rawMods = Array.isArray((req.body as any).moderators) ? (req.body as any).moderators : [];
          const cleanMods: string[] = Array.from(
            new Set<string>(
              rawMods
                .filter((user: unknown): user is string => typeof user === "string")
                .filter((user: string) => user !== owner && dm.users.includes(user)),
            ),
          ).sort((a, b) => a.localeCompare(b));
          if (!arraysEqual(cleanMods, sortStrings(dm.moderators || []))) {
            dm.moderators = cleanMods;
            changed = true;
          }
      }
      if (changed) {
        enforceGroupMetadata(dm, owner || me);
        writeDMs(data);
      }
      return res.status(200).json({ success: true, dm: presentDM(dm, me) });
    }
    if (action === "group-remove") {
      const dmId = typeof (req.body as any).dmId === "string" ? (req.body as any).dmId : "";
      const targetUser = typeof (req.body as any).target === "string" ? (req.body as any).target : "";
      if (!dmId || !targetUser) return res.status(400).json({ error: "Missing parameters" });
      const data = readDMs();
      const dm = data.dms.find((entry) => entry.id === dmId);
      if (!dm || !dm.group) return res.status(404).json({ error: "Group DM not found" });
      if (!dm.users.includes(me)) return res.status(403).json({ error: "Unauthorized" });
      if (!dm.users.includes(targetUser)) return res.status(400).json({ error: "User not in group DM" });
      const normalized = presentDM(dm, me);
      const owner = normalized.owner;
      const isOwner = owner === me;
      const isModerator = isGroupModerator(normalized, me);
      const isSelf = targetUser === me;
      if (!isSelf && !isModerator) return res.status(403).json({ error: "Insufficient permissions" });
      if (!isSelf && targetUser === owner) return res.status(400).json({ error: "Cannot remove the owner" });
      dm.users = dm.users.filter((user) => user !== targetUser);
      dm.moderators = (dm.moderators || []).filter((user) => user !== targetUser);
      if (targetUser === owner) {
        dm.owner = dm.users[0];
      }
      enforceGroupMetadata(dm, dm.owner || me);
      writeDMs(data);
      const stillMember = dm.users.includes(me);
      return res.status(200).json({ success: true, dm: presentDM(dm, me), removed: !stillMember });
    }
    return res.status(400).json({ error: "Unknown action" });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
