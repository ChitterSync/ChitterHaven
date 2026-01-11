import crypto from "crypto";
import { randomBase64Url } from "./base64";

export const createState = (bytes = 16) => randomBase64Url(bytes);

export const isValidState = (expected: string | null | undefined, actual: string | null | undefined) => {
  if (!expected || !actual) return false;
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
};
