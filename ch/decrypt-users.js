const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Path to your encrypted users.json
const filePath = path.join(__dirname, 'src/pages/api/users.json');

// Use your actual secret if you set CHITTERHAVEN_SECRET, otherwise default:
const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const key = crypto.createHash('sha256').update(SECRET).digest();

const data = fs.readFileSync(filePath);
const iv = data.slice(0, 16);
const encrypted = data.slice(16);

const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
let decrypted = decipher.update(encrypted);
decrypted = Buffer.concat([decrypted, decipher.final()]);

console.log(decrypted.toString());