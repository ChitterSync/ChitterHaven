// Prunes local encrypted JSON data while keeping a small allowlist.
// Default is DRY-RUN: it only logs what it WOULD do.
// Run with: node prune-data.js [--commit]
//
// Keeps:
//   - Users: speed_devil50, pettyisdead
//   - Haven: ChitterHaven (in server-settings.json)
// Flushes (when --commit): history, dms, invites, friends, settings, audit log.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const API_DIR = path.join(ROOT, "src", "pages", "api");

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();

function decryptFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  if (buf.length <= 16) return null;
  const iv = buf.slice(0, 16);
  const encrypted = buf.slice(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const json = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function encryptFile(filePath, data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
  fs.writeFileSync(filePath, Buffer.concat([iv, enc]), { mode: 0o600 });
}

function pruneUsers(dryRun) {
  const filePath = path.join(API_DIR, "users.json");
  const data = decryptFile(filePath);
  if (!data || !Array.isArray(data.users)) {
    console.log("[users] nothing to prune or invalid format");
    return;
  }
  const before = data.users.length;
  const keep = ["speed_devil50", "pettyisdead"];
  const afterUsers = data.users.filter((u) => keep.includes(u.username));
  console.log(`[users] before=${before}, after=${afterUsers.length}`);
  if (dryRun) {
    console.log("[users] DRY-RUN: not writing changes");
    return;
  }
  const next = { ...data, users: afterUsers };
  encryptFile(filePath, next);
  console.log("[users] wrote pruned users.json");
}

function pruneServerSettings(dryRun) {
  const filePath = path.join(API_DIR, "server-settings.json");
  const data = decryptFile(filePath);
  if (!data || typeof data !== "object") {
    console.log("[server-settings] nothing to prune or invalid format");
    return;
  }
  const keys = Object.keys(data);
  const next = {};
  if (data["ChitterHaven"]) {
    next["ChitterHaven"] = data["ChitterHaven"];
  }
  console.log(`[server-settings] before keys=${keys.length}, after keys=${Object.keys(next).length}`);
  if (dryRun) {
    console.log("[server-settings] DRY-RUN: not writing changes");
    return;
  }
  encryptFile(filePath, next);
  console.log("[server-settings] wrote pruned server-settings.json");
}

function flushFile(name, dryRun) {
  const filePath = path.join(API_DIR, name);
  if (!fs.existsSync(filePath)) {
    console.log(`[flush] ${name}: does not exist (skipped)`);
    return;
  }
  if (dryRun) {
    console.log(`[flush] ${name}: would delete/reset (DRY-RUN)`);
    return;
  }
  try {
    fs.unlinkSync(filePath);
    console.log(`[flush] ${name}: deleted`);
  } catch (e) {
    console.log(`[flush] ${name}: failed to delete: ${e.message}`);
  }
}

function main() {
  const commit = process.argv.includes("--commit");
  const dryRun = !commit;
  console.log(dryRun ? "[mode] DRY-RUN (no changes will be written)" : "[mode] COMMIT (will write changes)");

  pruneUsers(dryRun);
  pruneServerSettings(dryRun);

  // State files that can be flushed safely (history, DMs, invites, settings, audit, etc.)
  const flushList = [
    "history.json",
    "dms.json",
    "invites.json",
    "friends.json",
    "settings.json",
    "audit-log.json",
  ];
  flushList.forEach((name) => flushFile(name, dryRun));

  console.log("Done.");
}

main();

