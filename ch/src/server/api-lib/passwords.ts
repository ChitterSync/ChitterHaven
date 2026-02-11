import crypto from "crypto";

const PBKDF2_ITERS = 150000;
const PBKDF2_BYTES = 32;
const SCRYPT_BYTES = 64;
const SALT_BYTES = 16;

const parseNumber = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getScryptParams = () => ({
  N: parseNumber(process.env.CHITTER_SCRYPT_N, 16384),
  r: parseNumber(process.env.CHITTER_SCRYPT_R, 8),
  p: parseNumber(process.env.CHITTER_SCRYPT_P, 1),
});

export const generateSalt = () => crypto.randomBytes(SALT_BYTES).toString("base64");

export const hashPasswordPbkdf2 = (password: string, saltBase64: string) =>
  crypto.pbkdf2Sync(password, Buffer.from(saltBase64, "base64"), PBKDF2_ITERS, PBKDF2_BYTES, "sha256").toString("base64");

export const hashPasswordScrypt = (password: string, saltBase64: string) => {
  const salt = Buffer.from(saltBase64, "base64");
  const params = getScryptParams();
  return crypto.scryptSync(password, salt, SCRYPT_BYTES, params).toString("base64");
};

export const timingSafeEqualBase64 = (a: string, b: string) => {
  const left = Buffer.from(a, "base64");
  const right = Buffer.from(b, "base64");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};
