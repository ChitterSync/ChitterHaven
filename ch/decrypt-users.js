const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Path to your encrypted users.json
const filePath = path.join(__dirname, 'src/pages/api/users.json');

// Use your actual secret if you set CHITTERHAVEN_SECRET, otherwise default:
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const key = crypto.createHash('sha256').update(SECRET).digest();

const data = fs.readFileSync(filePath);

const MAGIC = Buffer.from("CHTR1");
const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;
const LEGACY_IV_BYTES = 16;

const parseUsers = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const decryptGcm = (payload) => {
  const ivStart = MAGIC.length;
  const ivEnd = ivStart + GCM_IV_BYTES;
  const tagEnd = ivEnd + GCM_TAG_BYTES;
  if (payload.length <= tagEnd) return null;
  const iv = payload.subarray(ivStart, ivEnd);
  const tag = payload.subarray(ivEnd, tagEnd);
  const ciphertext = payload.subarray(tagEnd);
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", getUsersKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString();
    return parseUsers(decrypted);
  } catch {
    return null;
  }
};

const decryptLegacy = (payload) => {
  if (payload.length <= LEGACY_IV_BYTES) return null;
  const iv = payload.subarray(0, LEGACY_IV_BYTES);
  const ciphertext = payload.subarray(LEGACY_IV_BYTES);
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString();
    return parseUsers(decrypted);
  } catch {
    return null;
  }
};

const getUsersKey = () => {
  const keyBase64 = process.env.CHITTERHAVEN_USERS_KEY;
  if (keyBase64) {
    const k = Buffer.from(keyBase64, "base64");
    if (k.length !== 32) throw new Error("CHITTERHAVEN_USERS_KEY must be base64-encoded 32 bytes.");
    return k;
  }
  return key;
};

let decoded = null;
if (data.subarray(0, MAGIC.length).equals(MAGIC)) {
  decoded = decryptGcm(data);
} else {
  decoded = decryptLegacy(data);
}

if (!decoded) {
  // Fallback: plaintext JSON
  decoded = parseUsers(data.toString("utf8"));
}

if (!decoded) {
  throw new Error("Failed to decrypt users.json. Check CHITTERHAVEN_USERS_KEY (GCM) or CHITTERHAVEN_SECRET (legacy CBC).");
}

console.log(JSON.stringify(decoded, null, 2));
