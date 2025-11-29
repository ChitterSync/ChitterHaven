const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HISTORY_PATH = path.join(process.cwd(), 'src/pages/api/history.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

function decryptHistory() {
  if (!fs.existsSync(HISTORY_PATH)) return {};
  const encrypted = fs.readFileSync(HISTORY_PATH);
  if (encrypted.length <= 16) return {};
  const iv = encrypted.slice(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted.slice(16)),
    decipher.final()
  ]).toString();
  try { return JSON.parse(decrypted); } catch { return {}; }
}

function encryptHistory(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data)),
    cipher.final()
  ]);
  fs.writeFileSync(HISTORY_PATH, Buffer.concat([iv, encrypted]), { mode: 0o600 });
}

function saveMessageLocal(room, msg) {
  const data = decryptHistory();
  if (!data[room]) data[room] = [];
  if (msg.systemType === 'call-summary') {
    const existing = (data[room] || []).find(m => m && m.systemType === 'call-summary');
    if (existing) return existing;
  }
  const message = {
    id: crypto.randomUUID(),
    user: msg.user,
    text: msg.text,
    timestamp: Date.now(),
    replyToId: msg.replyToId || null,
    reactions: {},
    pinned: false,
    attachments: msg.attachments || [],
    editHistory: [],
    systemType: msg.systemType
  };
  data[room].push(message);
  encryptHistory(data);
  return message;
}

// Test: create a fresh room and attempt two call-summary saves
const ROOM = 'test__call_summary_room';
function resetRoom() {
  const data = decryptHistory();
  data[ROOM] = [];
  encryptHistory(data);
}

resetRoom();
const first = saveMessageLocal(ROOM, { user: 'alice', text: 'Call ended • 5m', systemType: 'call-summary' });
const second = saveMessageLocal(ROOM, { user: 'bob', text: 'Call ended • 6m', systemType: 'call-summary' });

if (first.id === second.id) {
  console.log('PASS - duplicate call-summary prevented (same id returned)');
  process.exit(0);
} else {
  console.error('FAIL - duplicate call-summary allowed', first, second);
  process.exit(2);
}
