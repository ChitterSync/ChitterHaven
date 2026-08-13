import type { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "@/server/api-lib/jwt";
import { getAuthCookie } from "@/server/api-lib/authCookie";
import { createMigrationHandoff } from "@/server/api-lib/migrationHandoff";
import { readUsers } from "@/server/api-lib/usersStore";

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

  const user = readUsers().users.find((entry) => entry.username === payload.username);
  if (!user) {
    return res.status(404).json({ error: "The local ChitterHaven account was not found." });
  }

  try {
    const profile = user.profile || {};
    const location = typeof profile.location === "string" ? profile.location.trim() : "";
    const handoff = createMigrationHandoff({
      username: user.username,
      name: typeof profile.displayName === "string" ? profile.displayName : undefined,
      pronouns: typeof profile.pronouns === "string" ? profile.pronouns : undefined,
      bio: typeof profile.bio === "string" ? profile.bio : undefined,
      website: typeof profile.website === "string" ? profile.website : undefined,
      locations: location ? [location] : undefined,
      gender: typeof profile.gender === "string" ? profile.gender : undefined,
      dob: typeof profile.dob === "string" ? profile.dob : undefined,
    });
    const redirect = "https://chittersync.com/home";
    const url = `${baseUrl}/legacy?handoff=${encodeURIComponent(handoff)}&redirect=${encodeURIComponent(redirect)}`;
    return res.status(200).json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The migration link could not be created.";
    return res.status(500).json({ error: message });
  }
}
