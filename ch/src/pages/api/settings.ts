import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { verifyJWT } from "./jwt";
import { getAuthCookie } from "./_lib/authCookie";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const SETTINGS_PATH = path.join(process.cwd(), "src/pages/api/settings.json");
type HavenRecord = { name: string; channels: string[] };
type HavenMap = Record<string, HavenRecord>;

const DEFAULT_HAVENS: HavenMap = {
  ChitterHaven: { name: "ChitterHaven", channels: ["general", "random"] },
};
const cloneDefaultHavens = (): HavenMap =>
  Object.fromEntries(
    Object.entries(DEFAULT_HAVENS).map(([id, record]) => [id, { name: record.name, channels: [...record.channels] }]),
  );
const AUTH_SERVICE_BASE_RAW = process.env.AUTH_SERVICE_URL || process.env.AUTH_BASE_URL || "";
const AUTH_SERVICE_BASE = AUTH_SERVICE_BASE_RAW ? AUTH_SERVICE_BASE_RAW.replace(/\/$/, "") : "";
const AUTH_SERVICE_KEY = process.env.AUTH_SERVICE_KEY || process.env.SERVICE_API_KEY || "";
const hasGlobalSync = Boolean(AUTH_SERVICE_BASE && AUTH_SERVICE_KEY);

type UserSettings = {
  theme?: "dark" | "light" | "system";
  compact?: boolean;
  compactSidebar?: boolean;
  showTimestamps?: boolean;
  chatStyle?: string;
  messageFontSize?: string;
  appearance?: {
    messageGrouping?: "none" | "compact" | "aggressive";
    messageStyle?: "bubbles" | "classic" | "sleek" | "minimal_log" | "focus" | "thread_forward" | "retro";
    timeFormat?: "12h" | "24h";
    timeDisplay?: "absolute" | "relative" | "hybrid";
    timestampGranularity?: "perMessage" | "perGroup";
    systemMessageEmphasis?: "prominent" | "normal" | "dimmed" | "collapsible";
    maxContentWidth?: number | null;
    accentIntensity?: "subtle" | "normal" | "bold";
    readingMode?: boolean;
    fillScreen?: boolean;
  };
  accentHex?: string;
  boldColorHex?: string;
  italicColorHex?: string;
  pinColorHex?: string;
  mentionColorHex?: string;
  callHavensServers?: boolean;
  showTips?: boolean;
  reduceMotion?: boolean;
  showOnlineCount?: boolean;
  callsEnabled?: boolean;
  callRingSound?: boolean;
  callRingtone?: string;
  quickButtonsOwn?: string[];
  quickButtonsOthers?: string[];
  notifications?: { mentions?: boolean; pins?: boolean; soundEnabled?: boolean; volume?: number };
  status?: "online" | "idle" | "dnd" | "offline";
  statusMessage?: string;
  dndIsCosmetic?: boolean;
  richPresence?: { type: "game" | "music" | "custom"; title: string; details?: string };
  autoIdleEnabled?: boolean;
  blurOnUnfocused?: boolean;
  streamerMode?: boolean;
  streamerModeStyle?: 'blur' | 'shorten';
  havens?: HavenMap;
  enableOneko?: boolean;
  callrfMobileSizing?: boolean;
  friendNicknames?: Record<string, string>;
  havenNicknames?: Record<string, Record<string, string>>;
  lastSeenUpdateVersion?: string;
  disableMinorUpdatePopups?: boolean;
  disableMajorUpdatePopups?: boolean;
};
type SettingsData = { users: Record<string, UserSettings> };
type GlobalSettingsResult =
  | { status: "missing" | "not_found" | "error" }
  | { status: "ok"; settings: UserSettings; updatedAt: string | null };

function readSettings(): SettingsData {
  if (!fs.existsSync(SETTINGS_PATH)) return { users: {} };
  const buf = fs.readFileSync(SETTINGS_PATH);
  if (buf.length <= 16) return { users: {} };
  const iv = buf.slice(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const json = Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString();
  try { return JSON.parse(json); } catch { return { users: {} }; }
}

function writeSettings(data: SettingsData) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  fs.writeFileSync(SETTINGS_PATH, Buffer.concat([iv, enc]), { mode: 0o600 });
}

function sanitizeHavens(raw: any): HavenMap {
  if (!raw || typeof raw !== "object") {
    return cloneDefaultHavens();
  }
  const cleaned: HavenMap = {};
  for (const [id, value] of Object.entries(raw)) {
    if (typeof id !== "string") continue;
    if (Array.isArray(value)) {
      const normalized = Array.from(
        new Set(
          value
            .filter((ch): ch is string => typeof ch === "string")
            .map((ch) => ch.trim())
            .filter(Boolean),
        ),
      );
      if (normalized.length > 0) cleaned[id] = { name: id, channels: normalized };
      continue;
    }
    if (value && typeof value === "object") {
      const name = typeof (value as any).name === "string" && (value as any).name.trim().length
        ? String((value as any).name).trim()
        : id;
      const channelsRaw = Array.isArray((value as any).channels) ? (value as any).channels : [];
      const normalized = Array.from(
        new Set(
          channelsRaw
            .filter((ch: any): ch is string => typeof ch === "string")
            .map((ch: string) => ch.trim())
            .filter(Boolean),
        ),
      );
      if (normalized.length > 0) cleaned[id] = { name, channels: normalized };
    }
  }
  if (Object.keys(cleaned).length === 0) {
    return cloneDefaultHavens();
  }
  return cleaned;
}

const MAX_NICKNAME_LENGTH = 64;
const MAX_STATUS_MESSAGE = 140;
const MAX_RICH_TITLE = 80;
const MAX_RICH_DETAILS = 160;
const APPEARANCE_WIDTHS = [720, 840, 960, 1080];
const sanitizeNicknameValue = (value: any) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_NICKNAME_LENGTH) : "";
};

const sanitizeFriendNicknames = (raw: any): Record<string, string> => {
  if (!raw || typeof raw !== "object") return {};
  const next: Record<string, string> = {};
  Object.entries(raw).forEach(([user, nickname]) => {
    if (typeof user !== "string") return;
    const clean = sanitizeNicknameValue(nickname);
    if (clean) next[user] = clean;
  });
  return next;
};

const sanitizeHavenNicknames = (raw: any): Record<string, Record<string, string>> => {
  if (!raw || typeof raw !== "object") return {};
  const next: Record<string, Record<string, string>> = {};
  Object.entries(raw).forEach(([haven, map]) => {
    if (typeof haven !== "string" || !map || typeof map !== "object") return;
    const clean = sanitizeFriendNicknames(map);
    if (Object.keys(clean).length) next[haven] = clean;
  });
  return next;
};

const sanitizeStatusMessage = (value: any) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_STATUS_MESSAGE) : "";
};

const sanitizeRichPresence = (raw: any): UserSettings["richPresence"] | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const type = raw.type === "game" || raw.type === "music" || raw.type === "custom" ? raw.type : undefined;
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, MAX_RICH_TITLE) : "";
  const details = typeof raw.details === "string" ? raw.details.trim().slice(0, MAX_RICH_DETAILS) : "";
  if (!type || !title) return undefined;
  return details ? { type, title, details } : { type, title };
};

const sanitizeAppearancePatch = (raw: any): UserSettings["appearance"] | undefined => {
  if (!raw || typeof raw !== "object") return undefined;
  const patch: NonNullable<UserSettings["appearance"]> = {};
  if (raw.messageGrouping === "none" || raw.messageGrouping === "compact" || raw.messageGrouping === "aggressive") {
    patch.messageGrouping = raw.messageGrouping;
  }
  if (
    raw.messageStyle === "bubbles" ||
    raw.messageStyle === "classic" ||
    raw.messageStyle === "sleek" ||
    raw.messageStyle === "minimal_log" ||
    raw.messageStyle === "focus" ||
    raw.messageStyle === "thread_forward" ||
    raw.messageStyle === "retro"
  ) {
    patch.messageStyle = raw.messageStyle;
  }
  if (raw.timeFormat === "12h" || raw.timeFormat === "24h") {
    patch.timeFormat = raw.timeFormat;
  }
  if (raw.timeDisplay === "absolute" || raw.timeDisplay === "relative" || raw.timeDisplay === "hybrid") {
    patch.timeDisplay = raw.timeDisplay;
  }
  if (raw.timestampGranularity === "perMessage" || raw.timestampGranularity === "perGroup") {
    patch.timestampGranularity = raw.timestampGranularity;
  }
  if (raw.systemMessageEmphasis === "prominent" || raw.systemMessageEmphasis === "normal" || raw.systemMessageEmphasis === "dimmed" || raw.systemMessageEmphasis === "collapsible") {
    patch.systemMessageEmphasis = raw.systemMessageEmphasis;
  }
  if (typeof raw.maxContentWidth === "number" || raw.maxContentWidth === null) {
    patch.maxContentWidth = APPEARANCE_WIDTHS.includes(raw.maxContentWidth) ? raw.maxContentWidth : null;
  }
  if (raw.accentIntensity === "subtle" || raw.accentIntensity === "normal" || raw.accentIntensity === "bold") {
    patch.accentIntensity = raw.accentIntensity;
  }
  if (typeof raw.readingMode !== "undefined") {
    patch.readingMode = raw.readingMode === true;
  }
  if (typeof raw.fillScreen !== "undefined") {
    patch.fillScreen = raw.fillScreen === true;
  }
  return Object.keys(patch).length ? patch : undefined;
};

async function fetchGlobalSettings(username: string): Promise<GlobalSettingsResult> {
  if (!hasGlobalSync) return { status: "missing" };
  try {
    const res = await fetch(
      `${AUTH_SERVICE_BASE}/api/service/user-settings?username=${encodeURIComponent(username)}`,
      { headers: { Authorization: `Bearer ${AUTH_SERVICE_KEY}` } },
    );
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) {
      console.error("[settings] auth service GET failed:", await res.text());
      return { status: "error" };
    }
    const json = await res.json().catch(() => ({}));
    return {
      status: "ok",
      settings: (json?.settings || {}) as UserSettings,
      updatedAt: json?.updatedAt ?? null,
    };
  } catch (error) {
    console.error("[settings] auth service GET error:", error);
    return { status: "error" };
  }
}

async function pushGlobalSettings(username: string, settings: UserSettings) {
  if (!hasGlobalSync) return { status: "missing" as const };
  try {
    const res = await fetch(`${AUTH_SERVICE_BASE}/api/service/user-settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_SERVICE_KEY}`,
      },
      body: JSON.stringify({ username, settings }),
    });
    if (!res.ok) {
      console.error("[settings] auth service POST failed:", await res.text());
      return { status: "error" as const };
    }
    const json = await res.json().catch(() => ({}));
    return { status: "ok" as const, updatedAt: json?.updatedAt ?? null };
  } catch (error) {
    console.error("[settings] auth service POST error:", error);
    return { status: "error" as const };
  }
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getAuthCookie(req);
  const payload: any = token ? verifyJWT(token) : null;
  const me = payload?.username;
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const data = readSettings();
  const current = data.users[me] || {};

  if (req.method === "GET") {
    const remote = await fetchGlobalSettings(me);
    if (remote.status === "ok") {
      const remoteSettings = remote.settings || {};
      const appearancePatch = sanitizeAppearancePatch((remoteSettings as any).appearance);
      const sanitized = {
        ...remoteSettings,
        statusMessage: sanitizeStatusMessage((remoteSettings as any).statusMessage),
        richPresence: sanitizeRichPresence((remoteSettings as any).richPresence),
        dndIsCosmetic: (remoteSettings as any).dndIsCosmetic === true,
        havens: sanitizeHavens((remoteSettings as any).havens),
        friendNicknames: sanitizeFriendNicknames((remoteSettings as any).friendNicknames),
        havenNicknames: sanitizeHavenNicknames((remoteSettings as any).havenNicknames),
        appearance: appearancePatch || (remoteSettings as any).appearance,
      };
      return res.status(200).json({
        legacy: false,
        settings: sanitized,
        syncedAt: remote.updatedAt ?? null,
      });
    }
    const localNicknames = {
      friendNicknames: sanitizeFriendNicknames((current as any).friendNicknames),
      havenNicknames: sanitizeHavenNicknames((current as any).havenNicknames),
    };
    const response: Record<string, unknown> = {
      legacy: true,
      settings: {
        ...current,
        statusMessage: sanitizeStatusMessage((current as any).statusMessage),
        richPresence: sanitizeRichPresence((current as any).richPresence),
        dndIsCosmetic: (current as any).dndIsCosmetic === true,
        ...localNicknames,
        havens: sanitizeHavens(current.havens),
        appearance: sanitizeAppearancePatch((current as any).appearance) || (current as any).appearance,
      },
      syncedAt: null,
    };
    if (remote.status === "error") {
      response.syncError = "ChitterSync cloud settings are temporarily unavailable.";
    }
    return res.status(200).json(response);
  }

  if (req.method === "POST") {
    const patch: Partial<UserSettings> = req.body || {};
    if (patch.havens) {
      patch.havens = sanitizeHavens(patch.havens);
    }
    if (patch.friendNicknames) {
      patch.friendNicknames = sanitizeFriendNicknames(patch.friendNicknames);
    }
    if (patch.havenNicknames) {
      patch.havenNicknames = sanitizeHavenNicknames(patch.havenNicknames);
    }
    if (typeof (patch as any).statusMessage !== "undefined") {
      patch.statusMessage = sanitizeStatusMessage((patch as any).statusMessage);
    }
    if (typeof (patch as any).richPresence !== "undefined") {
      patch.richPresence = sanitizeRichPresence((patch as any).richPresence);
    }
    if (typeof (patch as any).dndIsCosmetic !== "undefined") {
      patch.dndIsCosmetic = (patch as any).dndIsCosmetic === true;
    }
    if (typeof (patch as any).appearance !== "undefined") {
      patch.appearance = sanitizeAppearancePatch((patch as any).appearance);
    }
    if (typeof (patch as any).disableMinorUpdatePopups !== "undefined") {
      patch.disableMinorUpdatePopups = (patch as any).disableMinorUpdatePopups === true;
    }
    if (typeof (patch as any).disableMajorUpdatePopups !== "undefined") {
      patch.disableMajorUpdatePopups = (patch as any).disableMajorUpdatePopups === true;
    }
    if (typeof (patch as any).callrfMobileSizing !== "undefined") {
      patch.callrfMobileSizing = (patch as any).callrfMobileSizing === true;
    }
    if (typeof (patch as any).lastSeenUpdateVersion !== "undefined") {
      const rawVersion = (patch as any).lastSeenUpdateVersion;
      if (typeof rawVersion === "string") {
        const trimmed = rawVersion.trim();
        if (trimmed) {
          patch.lastSeenUpdateVersion = trimmed.slice(0, 64);
        } else {
          delete (patch as any).lastSeenUpdateVersion;
        }
      } else {
        delete (patch as any).lastSeenUpdateVersion;
      }
    }
    const remote = await fetchGlobalSettings(me);
    const base = remote.status === "ok" ? remote.settings || {} : current;
    const merged: UserSettings = {
      ...base,
      ...patch,
      havens: patch.havens || sanitizeHavens((base as any).havens),
      friendNicknames: patch.friendNicknames || sanitizeFriendNicknames((base as any).friendNicknames),
      havenNicknames: patch.havenNicknames || sanitizeHavenNicknames((base as any).havenNicknames),
      notifications: { ...(base.notifications || {}), ...(patch.notifications || {}) },
      appearance: {
        ...(base.appearance || {}),
        ...(patch.appearance || {}),
      },
    };

    if (remote.status === "ok") {
      const pushResult = await pushGlobalSettings(me, merged);
      if (pushResult.status !== "ok") {
        return res.status(502).json({ error: "Failed to sync settings with ChitterSync auth." });
      }
      return res.status(200).json({
        success: true,
        legacy: false,
        settings: merged,
        syncedAt: pushResult.updatedAt ?? null,
      });
    }

    data.users[me] = merged;
    writeSettings(data);
    const response: Record<string, unknown> = {
      success: true,
      legacy: true,
      settings: merged,
      syncedAt: null,
    };
    if (remote.status === "error") {
      response.syncError = "ChitterSync cloud settings are temporarily unavailable.";
    }
    return res.status(200).json(response);
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
