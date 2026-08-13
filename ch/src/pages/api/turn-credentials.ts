import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { requireUser } from "@/server/api-lib/auth";
import { getClientIp, isExemptUsername, rateLimit } from "@/server/api-lib/rateLimit";

const MIN_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 3600;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }
  const user = await requireUser(req, res);
  if (!user) return;
  if (!isExemptUsername(user.username)) {
    const limit = rateLimit(`turn:${user.username || getClientIp(req)}`, 20, 60_000);
    if (!limit.allowed) return res.status(429).json({ error: "Too many credential requests" });
  }

  const sharedSecret = process.env.TURN_SHARED_SECRET;
  const urls = (process.env.TURN_URLS || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!sharedSecret || !urls.length) return res.status(503).json({ error: "TURN is not configured" });
  const configuredTtl = Number(process.env.TURN_TTL_SECONDS || 600);
  const ttl = Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, Number.isFinite(configuredTtl) ? configuredTtl : 600));
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;
  const username = `${expiresAt}:${user.username}`;
  const credential = crypto.createHmac("sha1", sharedSecret).update(username).digest("base64");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  return res.status(200).json({ iceServer: { urls, username, credential }, expiresAt });
}
