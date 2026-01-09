import type { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "../jwt";
import { getAuthCookie } from "../_lib/authCookie";

const normalizeBaseUrl = (raw: string) => {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
};

// --- handler (the main event).
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const token = getAuthCookie(req);
  const payload: any = token ? verifyJWT(token) : null;
  if (!payload?.username) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const baseRaw = process.env.AUTH_BASE_URL || process.env.AUTH_SERVICE_URL || "";
  const baseUrl = normalizeBaseUrl(baseRaw);
  if (!baseUrl) {
    return res.status(500).json({ error: "Auth service URL is not configured." });
  }

  const redirect = "https://chittersync.com/home";
  const url = `${baseUrl}/legacy?username=${encodeURIComponent(payload.username)}&redirect=${encodeURIComponent(redirect)}`;
  return res.status(200).json({ url });
}
