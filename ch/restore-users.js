const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Load restore file (supports legacy plaintext passwords)
const restorePath = path.join(__dirname, 'src/pages/api/users-restore.json');
const usersPath = path.join(__dirname, 'src/pages/api/users.json');
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const key = crypto.createHash('sha256').update(SECRET).digest();

const usersData = JSON.parse(fs.readFileSync(restorePath, 'utf8'));
if (Array.isArray(usersData.users)) {
  usersData.users = usersData.users.map((user) => {
    if (user.passwordHash && user.passwordSalt) return user;
    if (!user.password) return user;
    const salt = crypto.randomBytes(16).toString('base64');
    const passwordHash = crypto.pbkdf2Sync(user.password, Buffer.from(salt, 'base64'), 150000, 32, 'sha256').toString('base64');
    const next = { ...user, passwordHash, passwordSalt: salt, passwordAlgo: 'pbkdf2' };
    delete next.password;
    return next;
  });
}

// Encrypt and save
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
const encrypted = Buffer.concat([
  cipher.update(JSON.stringify(usersData)),
  cipher.final()
]);
fs.writeFileSync(usersPath, Buffer.concat([iv, encrypted]), { mode: 0o600 });

console.log('users.json restored and encrypted!');
