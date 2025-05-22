import jwt from "jsonwebtoken";

const SECRET = process.env.CHITTERHAVEN_SECRET || "chitterhaven_secret";

export function signJWT(payload: object, expiresIn: string | number = "7d") {
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyJWT(token: string) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}
