import fs from "fs";
import path from "path";
import crypto from "crypto";

export type UserProfile = {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  [key: string]: any;
};

export type UserRecord = {
  username: string;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  passwordAlgo?: "pbkdf2" | "scrypt";
  profile?: UserProfile;
  roles?: string[];
  [key: string]: any;
};

export type UsersData = { users: UserRecord[] };

const USERS_PATH = path.join(process.cwd(), "src/pages/api/users.json");
const MAGIC = Buffer.from("CHTR1");
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;
const LEGACY_IV_BYTES = 16;
const isProduction = process.env.NODE_ENV === "production";

const getLegacyKey = () => {
  const secret = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
  if (isProduction && secret === "chitterhaven_secret") {
    throw new Error("CHITTERHAVEN_SECRET must be set in production.");
  }
  return crypto.createHash("sha256").update(secret).digest();
};

const getUsersKey = () => {
  const keyBase64 = process.env.CHITTERHAVEN_USERS_KEY;
  if (keyBase64) {
    const key = Buffer.from(keyBase64, "base64");
    if (key.length !== 32) {
      throw new Error("CHITTERHAVEN_USERS_KEY must be a base64-encoded 32-byte key.");
    }
    return key;
  }
  if (isProduction) {
    throw new Error("CHITTERHAVEN_USERS_KEY must be set in production.");
  }
  return getLegacyKey();
};

const parseUsers = (raw: string): UsersData => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.users)) {
      return parsed;
    }
  } catch {
    // fall through
  }
  return { users: [] };
};

export const readUsers = (): UsersData => {
  if (!fs.existsSync(USERS_PATH)) return { users: [] };
  const payload = fs.readFileSync(USERS_PATH);
  if (payload.length === 0) return { users: [] };

  try {
    if (payload.subarray(0, MAGIC.length).equals(MAGIC)) {
      const ivStart = MAGIC.length;
      const ivEnd = ivStart + GCM_IV_BYTES;
      const tagEnd = ivEnd + GCM_TAG_BYTES;
      if (payload.length <= tagEnd) return { users: [] };
      const iv = payload.subarray(ivStart, ivEnd);
      const tag = payload.subarray(ivEnd, tagEnd);
      const ciphertext = payload.subarray(tagEnd);
      const decipher = crypto.createDecipheriv("aes-256-gcm", getUsersKey(), iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString();
      return parseUsers(decrypted);
    }

    if (payload.length <= LEGACY_IV_BYTES) return { users: [] };
    const iv = payload.subarray(0, LEGACY_IV_BYTES);
    const ciphertext = payload.subarray(LEGACY_IV_BYTES);
    const decipher = crypto.createDecipheriv("aes-256-cbc", getLegacyKey(), iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString();
    return parseUsers(decrypted);
  } catch {
    return { users: [] };
  }
};

export const writeUsers = (data: UsersData) => {
  const key = getUsersKey();
  const iv = crypto.randomBytes(GCM_IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const serialized = JSON.stringify(data);
  const ciphertext = Buffer.concat([cipher.update(serialized), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([MAGIC, iv, tag, ciphertext]);
  fs.writeFileSync(USERS_PATH, payload, { mode: 0o600 });
};
