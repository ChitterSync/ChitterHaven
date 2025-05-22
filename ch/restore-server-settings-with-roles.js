const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Load plaintext restore file
const restorePath = path.join(__dirname, 'src/pages/api/server-settings-restore.json');
const settingsPath = path.join(__dirname, 'src/pages/api/server-settings.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const key = crypto.createHash('sha256').update(SECRET).digest();
const IV_LENGTH = 16;

const settingsData = JSON.parse(fs.readFileSync(restorePath, 'utf8'));

// Encrypt and save
const iv = crypto.randomBytes(IV_LENGTH);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
const encrypted = Buffer.concat([
  cipher.update(JSON.stringify(settingsData)),
  cipher.final()
]);
fs.writeFileSync(settingsPath, Buffer.concat([iv, encrypted]), { mode: 0o600 });

console.log('server-settings.json restored and encrypted with roles!');
