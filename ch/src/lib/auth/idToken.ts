import crypto from "crypto";
import jwt, { type Algorithm, JwtPayload } from "jsonwebtoken";
import { getJwks } from "./jwks";

type VerifyOptions = {
  authBaseUrl: string;
  issuer: string;
  audience: string;
  nonce?: string | null;
};

export const verifyIdToken = async (idToken: string, options: VerifyOptions) => {
  try {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded !== "object" || !("header" in decoded)) {
      return null;
    }

    const header = decoded.header as { kid?: string; alg?: string };
    const jwks = await getJwks(options.authBaseUrl);
    const jwk =
      (header.kid ? jwks.keys.find((key) => key.kid === header.kid) : null) || jwks.keys[0];
    if (!jwk) return null;

    const key = crypto.createPublicKey({ key: jwk, format: "jwk" });
    const pem = key.export({ format: "pem", type: "spki" }).toString();
    const algorithm = (header.alg || "RS256") as Algorithm;
    const payload = jwt.verify(idToken, pem, {
      algorithms: [algorithm],
      issuer: options.issuer,
      audience: options.audience,
    }) as JwtPayload;

    if (options.nonce && payload.nonce !== options.nonce) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

export type { VerifyOptions };
