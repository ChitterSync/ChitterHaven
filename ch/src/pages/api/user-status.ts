import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { verifyJWT } from "@/server/api-lib/jwt";
import { getAuthCookie } from "@/server/api-lib/authCookie";
import { readSessionFromRequest } from "@/lib/auth/session";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const SETTINGS_PATH = path.join(process.cwd(), "src/pages/api/settings.json");

const AUTH_SERVICE_BASE_RAW = process.env.AUTH_SERVICE_URL || process.env.AUTH_BASE_URL || "";
const AUTH_SERVICE_BASE = AUTH_SERVICE_BASE_RAW ? AUTH_SERVICE_BASE_RAW.replace(/\/$/, "") : "";
const AUTH_SERVICE_KEY = process.env.AUTH_SERVICE_KEY || process.env.SERVICE_API_KEY || "";
const hasGlobalSync = Boolean(AUTH_SERVICE_BASE && AUTH_SERVICE_KEY);
const STEAM_API_KEY = process.env.STEAM_API_KEY || "";


type UserSettings = {
  status?: "online" | "idle" | "dnd" | "offline";
  statusMessage?: string;
  richPresence?: { type: "game" | "music" | "custom"; title: string; details?: string };
  steamId?: string;
  steamRichPresence?: boolean;
};
type SettingsData = { users: Record<string, UserSettings> };

function readSettings(): SettingsData {
  if (!fs.existsSync(SETTINGS_PATH)) return { users: {} };
  const buf = fs.readFileSync(SETTINGS_PATH);
  if (buf.length <= 16) return { users: {} };
  const iv = buf.slice(0, 16);
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
    const json = Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString();
    return JSON.parse(json);
  } catch {
    try {
      const plaintext = buf.toString("utf8");
      return JSON.parse(plaintext);
    } catch {
      return { users: {} };
    }
  }
}



type CacheEntry<T> = { value: T; expiresAt: number };
const getCache = <T,>() => {
  const g = globalThis as typeof globalThis & { __ch_status_cache?: Record<string, CacheEntry<T>> };
  if (!g.__ch_status_cache) g.__ch_status_cache = {};
  return g.__ch_status_cache as Record<string, CacheEntry<T>>;
};

const getSteamCache = () => {
  const g = globalThis as typeof globalThis & { __ch_steam_cache?: Record<string, CacheEntry<any>> };
  if (!g.__ch_steam_cache) g.__ch_steam_cache = {};
  return g.__ch_steam_cache;
};

const fetchGlobalSettings = async (username: string): Promise<UserSettings | null> => {
  if (!hasGlobalSync) return null;
  const cache = getCache<UserSettings>();
  const cached = cache[username];
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const res = await fetch(
      `${AUTH_SERVICE_BASE}/api/service/user-settings?username=${encodeURIComponent(username)}`,
      { headers: { Authorization: `Bearer ${AUTH_SERVICE_KEY}` } },
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const settings = (json?.settings || null) as UserSettings | null;
    if (settings) {
      cache[username] = { value: settings, expiresAt: Date.now() + 90_000 };
    }
    return settings;
  } catch {
    return null;
  }
};

const fetchSteamPresence = async (steamId: string) => {
  if (!STEAM_API_KEY) return null;
  const cache = getSteamCache();
  const cached = cache[steamId];
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(
        STEAM_API_KEY,
      )}&steamids=${encodeURIComponent(steamId)}`,
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const player = json?.response?.players?.[0];
    const game = player?.gameextrainfo ? String(player.gameextrainfo) : "";
    const payload = game ? { title: game, details: "Steam" } : null;
    cache[steamId] = { value: payload, expiresAt: Date.now() + 90_000 };
    return payload;
  } catch {
    return null;
  }
};

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  const session = readSessionFromRequest(req);
  const token = getAuthCookie(req);
  const payload: any = token ? verifyJWT(token) : null;
  if (!payload?.username && !session?.user?.username) return res.status(401).json({ error: "Unauthorized" });

  const usersParam = String(req.query.users || "").trim();
  const ask = usersParam ? usersParam.split(",").map(s => s.trim()).filter(Boolean) : [];
  const data = readSettings();
  const map: Record<string, string> = {};
  const statusMessages: Record<string, string> = {};
  const richPresence: Record<string, UserSettings["richPresence"]> = {};
  if (ask.length > 0) {
    for (const u of ask) {
      const localEntry = data.users[u] || {};
      const remoteEntry = await fetchGlobalSettings(u);
      const entry = remoteEntry || localEntry;
      map[u] = entry.status || "offline";
      if (typeof entry.statusMessage === "string" && entry.statusMessage.trim()) {
        statusMessages[u] = entry.statusMessage.trim();
      }
      if (entry.steamRichPresence && entry.steamId) {
        const steam = await fetchSteamPresence(entry.steamId);
        if (steam?.title) {
          richPresence[u] = { type: "game", title: steam.title, details: steam.details };
          continue;
        }
      }
      if (entry.richPresence && entry.richPresence.title) {
        richPresence[u] = entry.richPresence;
      }
    }
  }
  return res.status(200).json({ statuses: map, statusMessages, richPresence });
}
