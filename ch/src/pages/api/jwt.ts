import jwt, { SignOptions } from "jsonwebtoken";

// --- tiny JWT wrapper so we don't copy/paste options everywhere.
const isProduction = process.env.NODE_ENV === "production";
const SECRET = (process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret") as string;
const ISSUER = process.env.CHITTERHAVEN_JWT_ISSUER || "chitterhaven";
const AUDIENCE = process.env.CHITTERHAVEN_JWT_AUDIENCE || "chitterhaven";
const ALGORITHM: jwt.Algorithm = "HS512";

if (isProduction && SECRET === "chitterhaven_secret") {
  throw new Error("CHITTERHAVEN_SECRET must be set in production.");
}

export function signJWT(payload: object, expiresIn: SignOptions["expiresIn"] = "7d") {
  const options: SignOptions = { expiresIn, issuer: ISSUER, audience: AUDIENCE, algorithm: ALGORITHM };
  return jwt.sign(payload, SECRET, options);
}

export function verifyJWT(token: string) {
  try {
    return jwt.verify(token, SECRET, { issuer: ISSUER, audience: AUDIENCE, algorithms: [ALGORITHM] });
  } catch {
    return null;
  }
}
