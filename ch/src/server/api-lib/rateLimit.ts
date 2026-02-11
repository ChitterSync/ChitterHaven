import type { NextApiRequest } from "next";

type RateEntry = { count: number; resetAt: number };

const getStore = (): Map<string, RateEntry> => {
  const globalWithStore = globalThis as typeof globalThis & { __ch_rate_limit?: Map<string, RateEntry> };
  if (!globalWithStore.__ch_rate_limit) {
    globalWithStore.__ch_rate_limit = new Map();
  }
  return globalWithStore.__ch_rate_limit;
};

export const EXEMPT_USERNAME = "speed_devil50";

export const isExemptUsername = (username?: string | null) =>
  typeof username === "string" && username.trim().toLowerCase() === EXEMPT_USERNAME;

export const getClientIp = (req: NextApiRequest) => {
  const header = req.headers["x-forwarded-for"];
  const raw = Array.isArray(header) ? header[0] : header;
  const ip = raw ? raw.split(",")[0]?.trim() : "";
  return ip || req.socket?.remoteAddress || "unknown";
};

export const rateLimit = (key: string, limit: number, windowMs: number) => {
  const store = getStore();
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now > existing.resetAt) {
    const entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt };
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  store.set(key, existing);
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
};
