import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import cookie from "cookie";
import { verifyJWT } from "./jwt";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const DMS_PATH = path.join(process.cwd(), "src/pages/api/dms.json");

export type DM = { id: string; users: string[] };
type DMData = { dms: DM[] };

function readDMs(): DMData {
  if (!fs.existsSync(DMS_PATH)) return { dms: [] };
  const buf = fs.readFileSync(DMS_PATH);
  if (buf.length <= 16) return { dms: [] };
  const iv = buf.slice(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const json = Buffer.concat([decipher.update(buf.slice(16)), decipher.final()]).toString();
  try { return JSON.parse(json); } catch { return { dms: [] }; }
}

function writeDMs(data: DMData) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  fs.writeFileSync(DMS_PATH, Buffer.concat([iv, enc]), { mode: 0o600 });
}

export function ensureDMForUsers(a: string, b: string): DM {
  const data = readDMs();
  const pair = [a, b].sort();
  const found = data.dms.find(dm => dm.users.length === 2 && dm.users.slice().sort().every((u, i) => u === pair[i]));
  if (found) return found;
  const dm: DM = { id: crypto.randomUUID(), users: pair };
  data.dms.push(dm);
  writeDMs(data);
  return dm;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.chitter_token;
  const payload: any = token ? verifyJWT(token) : null;
  const me = payload?.username;
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const data = readDMs();
    const mine = data.dms.filter(dm => dm.users.includes(me));
    return res.status(200).json({ dms: mine });
  }

  if (req.method === "POST") {
    const { action, target } = req.body || {};
    if (action === "ensure") {
      if (!target || target === me) return res.status(400).json({ error: "Invalid target" });
      const dm = ensureDMForUsers(me, target);
      return res.status(200).json({ success: true, dm });
    }
    return res.status(400).json({ error: "Unknown action" });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

