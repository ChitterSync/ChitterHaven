import crypto from "crypto";
import { base64UrlEncode, randomBase64Url } from "./base64";

export type PkcePair = {
  verifier: string;
  challenge: string;
  method: "S256";
};

export const createCodeVerifier = (bytes = 32) => randomBase64Url(bytes);

export const createCodeChallenge = (verifier: string) =>
  base64UrlEncode(crypto.createHash("sha256").update(verifier).digest());

export const createPkcePair = (): PkcePair => {
  const verifier = createCodeVerifier();
  return {
    verifier,
    challenge: createCodeChallenge(verifier),
    method: "S256",
  };
};
