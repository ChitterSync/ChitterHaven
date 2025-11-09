import jwt, { SignOptions } from "jsonwebtoken";

const SECRET = (process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret") as string;

export function signJWT(payload: object, expiresIn: SignOptions["expiresIn"] = "7d") {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, SECRET, options);
}

export function verifyJWT(token: string) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
