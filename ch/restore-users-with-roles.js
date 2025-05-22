const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Load plaintext restore file
const restorePath = path.join(__dirname, 'src/pages/api/users-restore.json');
const usersPath = path.join(__dirname, 'src/pages/api/users.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const key = crypto.createHash('sha256').update(SECRET).digest();

const usersData = JSON.parse(fs.readFileSync(restorePath, 'utf8'));

// Encrypt and save
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
const encrypted = Buffer.concat([
  cipher.update(JSON.stringify(usersData)),
  cipher.final()
]);
fs.writeFileSync(usersPath, Buffer.concat([iv, encrypted]), { mode: 0o600 });

console.log('users.json restored and encrypted with roles!');
