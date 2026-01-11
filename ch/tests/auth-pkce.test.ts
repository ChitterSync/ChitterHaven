import test from "node:test";
import assert from "node:assert/strict";
import { createCodeChallenge, createPkcePair } from "../src/lib/auth/pkce";

test("pkce pair creates a verifier and matching challenge", () => {
  const { verifier, challenge } = createPkcePair();
  assert.ok(verifier.length > 0);
  assert.ok(challenge.length > 0);
  assert.equal(challenge, createCodeChallenge(verifier));
});
