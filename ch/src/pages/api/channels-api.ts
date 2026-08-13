import type { NextApiRequest, NextApiResponse } from "next";
import { createChannel, getChannel, listUserChannels } from "@/server/api-lib/channels";
import { prisma } from "@/server/api-lib/prismaClient";
import { requireUser } from "@/server/api-lib/auth";

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = await requireUser(req, res);
  if (!payload) return;
  const me = payload.username as string;

  if (req.method === "POST") {
    const { name, members, isGroup, haven } = req.body || {};
    if (!Array.isArray(members) || members.length < 2) {
      res.status(400).json({ error: "At least two members required" });
      return;
    }
    if (!members.includes(me)) return res.status(403).json({ error: "You must be a member of the channel you create" });
    // If this is a haven channel operation, require manage_channels
    if (haven) {
      const setting = await prisma.serverSetting.findUnique({ where: { key: String(haven) } });
      const value: any = setting ? JSON.parse(setting.value) : {};
      const perms = value.permissions || {};
      const rolesMap: Record<string,string[]> = perms.roles || {};
      const memberRoles: string[] = (perms.members?.[me] || []) as string[];
      const everyone: string[] = (perms.defaults?.everyone || []) as string[];
      const allowed = memberRoles.some(r => (rolesMap[r] || []).includes('*') || (rolesMap[r] || []).includes('manage_channels')) || everyone.includes('manage_channels') || everyone.includes('*');
      if (!allowed) return res.status(403).json({ error: 'Forbidden' });
    }
    const channel = await createChannel(String(name || "DM").trim().slice(0, 80), Array.from(new Set(members.filter((entry): entry is string => typeof entry === "string"))).slice(0, 25), !!isGroup);
    res.status(200).json({ channel });
    return;
  }
  if (req.method === "GET") {
    const { userId, channelId } = req.query;
    if (channelId) {
      const channel = await getChannel(channelId as string);
      if (!channel) {
        res.status(404).json({ error: "Channel not found" });
        return;
      }
      if (!channel.members.includes(me)) return res.status(403).json({ error: "Forbidden" });
      res.status(200).json({ channel });
      return;
    }
    if (userId) {
      if (userId !== me) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const channels = await listUserChannels(userId as string);
      res.status(200).json({ channels });
      return;
    }
    res.status(400).json({ error: "Missing userId or channelId" });
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
}
