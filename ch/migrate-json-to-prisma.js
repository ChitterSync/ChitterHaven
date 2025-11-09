// Script to migrate users.json, server-settings.json, audit-log.json, and history.json to Prisma DB
// Run: node ch/migrate-json-to-prisma.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SECRET = process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

function decryptFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const encrypted = fs.readFileSync(filePath);
  if (encrypted.length <= 16) return null;
  const iv = encrypted.slice(0, 16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted.slice(16)),
    decipher.final()
  ]).toString();
  return JSON.parse(decrypted);
}

async function migrateUsers() {
  const filePath = path.join(__dirname, 'src/pages/api/users.json');
  const users = decryptFile(filePath);
  if (!users) return;
  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        password: user.password,
        email: user.email || null,
        roles: Array.isArray(user.roles) ? user.roles.join(',') : (user.roles || null),
      },
    });
  }
  console.log('Users migrated.');
}

async function migrateServerSettings() {
  const filePath = path.join(__dirname, 'src/pages/api/server-settings.json');
  if (!fs.existsSync(filePath)) return;
  const settings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const [key, value] of Object.entries(settings)) {
    await prisma.serverSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });
  }
  console.log('Server settings migrated.');
}

async function migrateAuditLog() {
  const filePath = path.join(__dirname, 'src/pages/api/audit-log.json');
  if (!fs.existsSync(filePath)) return;
  const logs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const log of logs) {
    await prisma.auditLog.create({
      data: {
        action: log.action,
        userId: log.userId || '',
        details: log.details ? JSON.stringify(log.details) : null,
        createdAt: log.timestamp ? new Date(log.timestamp) : undefined,
      },
    });
  }
  console.log('Audit log migrated.');
}

async function migrateHistory() {
  const filePath = path.join(__dirname, 'src/pages/api/history.json');
  if (!fs.existsSync(filePath)) return;
  // history.json is encrypted, so use decryptFile
  const history = decryptFile(filePath);
  if (!history) return;
  for (const [room, messages] of Object.entries(history)) {
    for (const msg of messages) {
      await prisma.messageHistory.create({
        data: {
          room,
          user: msg.user,
          text: msg.text,
          timestamp: new Date(msg.timestamp),
          edited: !!msg.edited,
          readBy: Array.isArray(msg.readBy) ? msg.readBy.join(',') : (msg.readBy || null),
        },
      });
    }
  }
  console.log('Message history migrated.');
}

async function main() {
  await migrateUsers();
  await migrateServerSettings();
  await migrateAuditLog();
  await migrateHistory();
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
