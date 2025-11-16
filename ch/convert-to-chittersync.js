// One-time helper to migrate local ChitterHaven users into the centralized
// ChitterSync auth service.
//
// - Reads and decrypts src/pages/api/users.json
// - For each user, POSTs to AUTH_BASE_URL/api/register
//   with loginId=username and the same password.
//
// Default: DRY-RUN (no network calls).
// Use: AUTH_BASE_URL=https://auth.chittersync.com node convert-to-chittersync.js --commit

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const USERS_PATH = path.join(ROOT, "src", "pages", "api", "users.json");

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";
const KEY = crypto.createHash("sha256").update(SECRET).digest();
const AUTH_BASE_URL = (process.env.AUTH_BASE_URL || "https://auth.chittersync.com").replace(/\/$/, "");

const commit = process.argv.includes("--commit");

function decryptUsers() {
  if (!fs.existsSync(USERS_PATH)) {
    console.error("[users] src/pages/api/users.json not found");
    process.exit(1);
  }
  const buf = fs.readFileSync(USERS_PATH);
  if (buf.length <= 16) {
    console.error("[users] file too small to be valid");
    process.exit(1);
  }
  const iv = buf.slice(0, 16);
  const encrypted = buf.slice(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const json = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString();
  try {
    return JSON.parse(json);
  } catch (e) {
    console.error("[users] failed to parse decrypted JSON:", e.message);
    process.exit(1);
  }
}

async function doFetch(url, options) {
  const globalAny = global;
  const f =
    typeof globalAny.fetch === "function"
      ? globalAny.fetch
      : (() => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require("node-fetch");
          } catch {
            console.error("[convert] fetch is not available; install node-fetch or run manually with curl.");
            process.exit(1);
          }
        })();
  return f(url, options);
}

async function main() {
  console.log(commit ? "[mode] COMMIT – will call auth service" : "[mode] DRY-RUN – no network calls");
  console.log(`[auth] AUTH_BASE_URL = ${AUTH_BASE_URL}`);

  const data = decryptUsers();
  const users = Array.isArray(data.users) ? data.users : [];
  console.log(`[users] found ${users.length} local users`);

  if (users.length === 0) {
    console.log("[users] nothing to migrate");
    return;
  }

  for (const u of users) {
    if (!u || !u.username || !u.password) {
      continue;
    }
    const payload = {
      loginId: u.username,
      password: u.password,
      username: u.username,
      email: "",
      phone: "",
      name: u.profile?.displayName || u.username,
      gender: null,
      dob: null,
      location: null,
    };

    console.log(`\n[user] ${u.username}`);
    console.log("  payload:", JSON.stringify(payload));

    if (!commit) {
      console.log("  DRY-RUN: would POST to", `${AUTH_BASE_URL}/api/register`);
      continue;
    }

    try {
      const res = await doFetch(`${AUTH_BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) {
        console.log(`  ERROR ${res.status}: ${text}`);
      } else {
        console.log("  OK:", text);
      }
    } catch (e) {
      console.log("  ERROR: fetch failed:", e.message);
    }
  }

  console.log("\nDone. Review output before deleting local users/settings.");
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});

