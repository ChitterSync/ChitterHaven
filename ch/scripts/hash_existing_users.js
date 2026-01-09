const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const USERS_PATH = path.join(__dirname, "../src/pages/api/users.json");

const PBKDF2_ITERS = 150000;
const PBKDF2_BYTES = 32;

function decryptUsers() {
  if (!fs.existsSync(USERS_PATH)) return { users: [] };
  const encrypted = fs.readFileSync(USERS_PATH);
  if (encrypted.length <= 16) return { users: [] };
  const iv = encrypted.slice(0, 16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const json = Buffer.concat([decipher.update(encrypted.slice(16)), decipher.final()]).toString();
  try {
    return JSON.parse(json);
  } catch {
    return { users: [] };
  }
}

function encryptUsers(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  fs.writeFileSync(USERS_PATH, Buffer.concat([iv, encrypted]), { mode: 0o600 });
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, Buffer.from(salt, "base64"), PBKDF2_ITERS, PBKDF2_BYTES, "sha256").toString("base64");
}

function migrateUsers() {
  const data = decryptUsers();
  if (!Array.isArray(data.users)) {
    console.error("users.json is not in the expected format.");
    process.exit(1);
  }
  let migrated = 0;
  data.users = data.users.map((user) => {
    if (user.passwordHash && user.passwordSalt) return user;
    if (!user.password) return user;
    const salt = crypto.randomBytes(16).toString("base64");
    const passwordHash = hashPassword(user.password, salt);
    const next = { ...user, passwordHash, passwordSalt: salt };
    next.passwordAlgo = "pbkdf2";
    delete next.password;
    migrated += 1;
    return next;
  });

  if (migrated > 0) {
    encryptUsers(data);
  }

  console.log(`Migrated ${migrated} user(s).`);
}

migrateUsers();
