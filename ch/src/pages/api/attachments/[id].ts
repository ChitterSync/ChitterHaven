import type { NextApiRequest, NextApiResponse } from "next";
import fs from "node:fs";
import path from "node:path";
import { requireUser } from "@/server/api-lib/auth";
import { canAccessRoom } from "@/server/api-lib/roomAuthorization";

type AttachmentMetadata = {
  id: string;
  owner: string;
  room: string | null;
  name: string;
  type: string;
  size: number;
};

const isId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const safeDispositionName = (value: string) => value.replace(/[\r\n"\\]/g, "_").slice(0, 100) || "attachment";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }
  const user = await requireUser(req, res);
  if (!user) return;
  const id = typeof req.query.id === "string" ? req.query.id : "";
  if (!isId(id)) return res.status(404).json({ error: "Attachment not found" });

  const root = path.join(process.cwd(), "data", "protected-uploads");
  const metadataPath = path.join(root, `${id}.json`);
  const filePath = path.join(root, id);
  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as AttachmentMetadata;
    if (metadata.id !== id || !fs.existsSync(filePath)) throw new Error("Invalid attachment metadata");
    if (metadata.room && !(await canAccessRoom(metadata.room, user.username))) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.setHeader("Content-Type", metadata.type);
    res.setHeader("Content-Length", String(metadata.size));
    res.setHeader("Content-Disposition", `inline; filename="${safeDispositionName(metadata.name)}"`);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    fs.createReadStream(filePath).pipe(res);
  } catch {
    return res.status(404).json({ error: "Attachment not found" });
  }
}
