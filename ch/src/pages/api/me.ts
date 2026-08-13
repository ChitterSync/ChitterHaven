import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/server/api-lib/auth";
import path from "path";
import { readEncryptedJson } from "@/lib/security/encryptedJsonFile";
import { getStoreKeyRing } from "@/lib/security/keyRings";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const SETTINGS_PATH = path.join(process.cwd(), "src/pages/api/settings.json");

type UserSettings = Record<string, any>;
type SettingsData = { users: Record<string, UserSettings> };

function readSettings(): SettingsData {
  return readEncryptedJson({ filePath: SETTINGS_PATH, purpose: "user-settings", ring: getStoreKeyRing(), legacySecret: SECRET, defaultValue: () => ({ users: {} }), validate: (value): value is SettingsData => !!value && typeof value === "object" && !!(value as SettingsData).users && typeof (value as SettingsData).users === "object" });
}

// --- handler (the main event).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = await requireUser(req, res);
  if (!payload) return;

  const data = readSettings();
  const settings = data.users[payload.username] || {};

  res.status(200).json({
    user: payload,
    settings,
  });
}
