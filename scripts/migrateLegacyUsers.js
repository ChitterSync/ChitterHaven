#!/usr/bin/env node
/**
 * Migrate legacy ChitterHaven users (encrypted JSON) into the new Prisma auth DB.
 *
 * Usage:
 *   node scripts/migrateLegacyUsers.js --legacy "..\\cs\\ChitterHaven\\ch\\src\\pages\\api\\users.json" [--secret "..."] [--dry-run]
 *
 * DATABASE_URL must be set before running so Prisma knows which database to write to.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const process = require('process');
const { PrismaClient } = require('@prisma/client');
const { v6: uuidv6 } = require('uuid');

const prisma = new PrismaClient();

function parseArgs(argv) {
  const options = {
    legacyPath: null,
    secret: process.env.CHITTERHAVEN_SECRET || 'chitterhaven_secret',
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--legacy' || arg === '--legacy-path') {
      options.legacyPath = argv[i + 1];
      i += 1;
    } else if (arg === '--secret') {
      options.secret = argv[i + 1];
      i += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  if (!options.legacyPath) {
    throw new Error('Missing required --legacy path to encrypted users.json');
  }

  return options;
}

function decryptUsersFile(filePath, secret) {
  const resolved = path.resolve(filePath);
  const buffer = fs.readFileSync(resolved);
  if (buffer.length < 17) {
    throw new Error(`Encrypted file too small: ${resolved}`);
  }
  const iv = buffer.subarray(0, 16);
  const encrypted = buffer.subarray(16);
  const key = crypto.createHash('sha256').update(secret).digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return JSON.parse(decrypted.toString('utf8'));
}

function toNullableString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function buildUserRecord(legacyUser) {
  const profile = legacyUser.profile || {};
  const emailArray = legacyUser.email ? [legacyUser.email] : [];
  const phoneArray = legacyUser.phone ? [legacyUser.phone] : [];
  const location = toNullableString(profile.location);

  return {
    id: uuidv6(),
    loginId: legacyUser.username,
    username: legacyUser.username,
    password: legacyUser.password,
    emails: emailArray.length ? emailArray : null,
    phones: phoneArray.length ? phoneArray : null,
    name: toNullableString(profile.displayName) || legacyUser.username,
    gender: toNullableString(profile.gender),
    dob: null,
    locations: location ? [location] : null,
    pronouns: toNullableString(profile.pronouns),
    bio: toNullableString(profile.bio),
    website: toNullableString(profile.website),
    tosAgreement: false,
    metadata: {
      legacySource: 'chitterhaven',
      roles: legacyUser.roles || [],
      avatarUrl: toNullableString(profile.avatarUrl),
      bannerUrl: toNullableString(profile.bannerUrl),
      migratedAt: new Date().toISOString(),
    },
  };
}

async function migrateUsers(options) {
  const payload = decryptUsersFile(options.legacyPath, options.secret);
  const users = Array.isArray(payload?.users) ? payload.users : [];
  console.log(`Found ${users.length} legacy users in ${options.legacyPath}`);

  const results = {
    created: 0,
    skipped: 0,
    errors: 0,
  };

  for (const legacyUser of users) {
    const record = buildUserRecord(legacyUser);
    try {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { loginId: record.loginId },
            { username: record.username },
          ],
        },
      });
      if (existing) {
        results.skipped += 1;
        console.warn(`Skipping ${record.username} (already exists as ${existing.id})`);
        continue;
      }

      if (options.dryRun) {
        results.created += 1;
        console.log(`[dry-run] Would create ${record.username}`);
        continue;
      }

      await prisma.user.create({ data: record });
      results.created += 1;
      console.log(`Created ${record.username} -> ${record.id}`);
    } catch (err) {
      results.errors += 1;
      console.error(`Failed to migrate ${legacyUser.username}:`, err);
    }
  }

  console.log('Migration summary:', results);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL must be set before running the migration.');
    process.exitCode = 1;
    return;
  }

  try {
    await migrateUsers(options);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});
