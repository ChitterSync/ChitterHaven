import type { NextApiRequest, NextApiResponse } from "next";
import { createChannel, getChannel, listUserChannels } from "./channels";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { name, members, isGroup } = req.body;
    if (!Array.isArray(members) || members.length < 2) {
      res.status(400).json({ error: "At least two members required" });
      return;
    }
    const channel = createChannel(name || "DM", members, !!isGroup);
    res.status(200).json({ channel });
    return;
  }
  if (req.method === "GET") {
    const { userId, channelId } = req.query;
    if (channelId) {
      const channel = getChannel(channelId as string);
      if (!channel) {
        res.status(404).json({ error: "Channel not found" });
        return;
      }
      res.status(200).json({ channel });
      return;
    }
    if (userId) {
      const channels = listUserChannels(userId as string);
      res.status(200).json({ channels });
      return;
    }
    res.status(400).json({ error: "Missing userId or channelId" });
    return;
  }
  res.status(405).json({ error: "Method not allowed" });
}
