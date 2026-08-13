import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/server/api-lib/auth";
import { prisma } from "@/server/api-lib/prismaClient";
import { canAccessRoom } from "@/server/api-lib/roomAuthorization";

const parseSequence = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") return BigInt(0);
  try {
    const parsed = BigInt(value);
    return parsed > BigInt(0) ? parsed : BigInt(0);
  } catch {
    return BigInt(0);
  }
};

const safeClientId = (value: unknown) =>
  typeof value === "string" && /^[a-zA-Z0-9:_-]{8,160}$/.test(value) ? value : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  const user = await requireUser(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const cursor = parseSequence(req.query.cursor);
    const before = parseSequence(req.query.before);
    const requestedRooms = typeof req.query.rooms === "string" ? req.query.rooms.split(",").filter(Boolean).slice(0, 100) : [];
    const authorizedRooms = (await Promise.all(requestedRooms.map(async (room) => await canAccessRoom(room, user.username) ? room : null))).filter((room): room is string => Boolean(room));
    const scope = authorizedRooms.length
      ? { OR: [{ conversationId: { in: authorizedRooms } }, { conversationId: null }] }
      : { conversationId: null };
    const latest = await prisma.realtimeEvent.findFirst({ where: scope, orderBy: { sequence: "desc" }, select: { sequence: true } });
    const latestSequence = latest?.sequence || BigInt(0);
    const pendingCount = cursor < latestSequence
      ? await prisma.realtimeEvent.count({ where: { AND: [scope, { sequence: { gt: cursor } }] } })
      : 0;
    const missingCount = before > cursor
      ? await prisma.realtimeEvent.count({ where: { AND: [scope, { sequence: { gt: cursor, lt: before } }] } })
      : 0;
    return res.status(200).json({
      latestSequence: latestSequence.toString(),
      hasGap: pendingCount > 0,
      pendingCount,
      missingCount,
    });
  }

  if (req.method === "POST") {
    const clientId = safeClientId(req.body?.clientId);
    if (!clientId) return res.status(400).json({ error: "Invalid clientId" });
    const lastSequence = parseSequence(req.body?.lastSequence);
    const cursor = await prisma.realtimeCursor.upsert({
      where: { userId_clientId: { userId: user.username, clientId } },
      update: { lastSequence },
      create: { userId: user.username, clientId, lastSequence },
      select: { lastSequence: true, updatedAt: true },
    });
    return res.status(200).json({ lastSequence: cursor.lastSequence.toString(), updatedAt: cursor.updatedAt.toISOString() });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
