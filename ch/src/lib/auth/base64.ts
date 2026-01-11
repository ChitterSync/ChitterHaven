import crypto from "crypto";

export const base64UrlEncode = (input: Buffer | Uint8Array) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

export const base64UrlDecode = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
};

export const randomBase64Url = (bytes = 32) => base64UrlEncode(crypto.randomBytes(bytes));
