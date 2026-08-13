import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { requireUser } from "@/server/api-lib/auth";
import { prisma } from "@/server/api-lib/prismaClient";
import { readEncryptedJson, writeEncryptedJson } from "@/lib/security/encryptedJsonFile";
import { getStoreKeyRing } from "@/lib/security/keyRings";

type Invite = {
  code: string;
  haven: string;
  createdAt: number;
  createdBy?: string;
  maxUses: number | null;
  uses: number;
  expiresAt: number | null;
};

const INVITE_PATH = path.join(process.cwd(), "src/pages/api/invites.json");
const HISTORY_PATH = path.join(process.cwd(), "src/pages/api/history.json");
const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const isInviteStore = (value: unknown): value is { invites: Invite[] } => !!value && typeof value === "object" && Array.isArray((value as { invites?: unknown }).invites);
const isHistory = (value: unknown): value is Record<string, Array<{ user: string }>> => !!value && typeof value === "object" && !Array.isArray(value);

function decryptInvites(): Invite[] {
  return readEncryptedJson({ filePath: INVITE_PATH, purpose: "invites", ring: getStoreKeyRing(), legacySecret: SECRET, defaultValue: () => ({ invites: [] }), validate: isInviteStore }).invites;
}

function encryptInvites(invites: Invite[]) {
  writeEncryptedJson({ invites }, { filePath: INVITE_PATH, purpose: "invites", ring: getStoreKeyRing(), legacySecret: SECRET, validate: isInviteStore });
}

function decryptHistory(): Record<string, Array<{ user: string }>> {
  return readEncryptedJson({ filePath: HISTORY_PATH, purpose: "history", ring: getStoreKeyRing(), legacySecret: SECRET, defaultValue: () => ({}), validate: isHistory });
}

function isExpired(inv: Invite, now: number) {
  if (inv.expiresAt && now > inv.expiresAt) return true;
  if (inv.maxUses != null && inv.uses >= inv.maxUses) return true;
  return false;
}

async function loadHavenInfo(haven: string) {
  try {
    const setting = await prisma.serverSetting.findUnique({ where: { key: haven } });
    const value = setting ? JSON.parse(setting.value) : {};
    return {
      name: typeof value?.name === "string" ? value.name : haven,
      icon: typeof value?.icon === "string" ? value.icon : null,
    };
  } catch {
    return { name: haven, icon: null };
  }
}

function getHavenMemberCount(haven: string) {
  const data = decryptHistory();
  const users = new Set<string>();
  Object.keys(data).forEach((room) => {
    const parts = room.split("__");
    if (parts.length === 2 && parts[0] === haven) {
      const msgs = data[room] || [];
      msgs.forEach((m) => {
        if (m && typeof (m as any).user === "string") users.add((m as any).user);
      });
    }
  });
  return users.size;
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const payload = await requireUser(req, res);
  if (!payload) return;
  const me = payload.username;

  const { action } = req.body || {};
  const now = Date.now();
  const invites = decryptInvites();

  if (action === "preview") {
    const rawCode = String(req.body.code || "").trim().toUpperCase();
    if (!rawCode) return res.status(400).json({ error: "Missing code" });
    const invite = invites.find((inv) => inv.code.toUpperCase() === rawCode);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (isExpired(invite, now)) {
      return res.status(410).json({ error: "Invite expired or exhausted" });
    }
    const havenInfo = await loadHavenInfo(invite.haven);
    const memberCount = getHavenMemberCount(invite.haven);
    return res.status(200).json({
      invite: {
        code: invite.code,
        haven: invite.haven,
        createdAt: invite.createdAt,
        createdBy: invite.createdBy,
        maxUses: invite.maxUses,
        uses: invite.uses,
        expiresAt: invite.expiresAt,
      },
      haven: {
        name: havenInfo.name,
        icon: havenInfo.icon,
        memberCount,
      },
    });
  }

  if (action === "consume") {
    const rawCode = String(req.body.code || "").trim().toUpperCase();
    if (!rawCode) return res.status(400).json({ error: "Missing code" });
    const idx = invites.findIndex((inv) => inv.code.toUpperCase() === rawCode);
    if (idx < 0) return res.status(404).json({ error: "Invite not found" });
    const invite = invites[idx];
    if (isExpired(invite, now)) {
      return res.status(410).json({ error: "Invite expired or exhausted" });
    }
    invites[idx] = { ...invite, uses: invite.uses + 1 };
    encryptInvites(invites);
    const havenInfo = await loadHavenInfo(invite.haven);
    const memberCount = getHavenMemberCount(invite.haven);
    return res.status(200).json({
      haven: invite.haven,
      code: invite.code,
      info: {
        name: havenInfo.name,
        icon: havenInfo.icon,
        memberCount,
      },
    });
  }

  // Default: create invite
  const haven = String(req.body.haven || "").trim();
  if (!haven) return res.status(400).json({ error: "Missing haven" });

  const days = typeof req.body.days === "number" ? req.body.days : 1;
  const maxUses =
    typeof req.body.maxUses === "number" && req.body.maxUses > 0
      ? Math.floor(req.body.maxUses)
      : null;

  const expiresAt =
    typeof days === "number" && days > 0 ? now + days * 24 * 60 * 60 * 1000 : null;

  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  const code = `CHINV-${rand}`;

  const invite: Invite = {
    code,
    haven,
    createdAt: now,
    createdBy: me,
    maxUses,
    uses: 0,
    expiresAt,
  };
  invites.push(invite);
  encryptInvites(invites);
  return res.status(200).json({ code, invite });
}
