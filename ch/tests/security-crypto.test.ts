import assert from "node:assert/strict";
import test from "node:test";
import { decryptPayload, encryptPayload, type KeyRing } from "../src/lib/security/aead";
import { redact } from "../src/lib/security/redaction";

const ring: KeyRing = { activeKeyId: "new", keys: new Map([["new", Buffer.alloc(32, 5)], ["old", Buffer.alloc(32, 6)]]) };
const binding = { service: "haven", purpose: "history", recordId: "history.json" };

test("AEAD uses active keys and unique nonces", () => {
  const payloads = Array.from({ length: 128 }, () => encryptPayload(Buffer.from("message"), ring, binding));
  assert.equal(new Set(payloads.map((payload) => payload.nonce)).size, payloads.length);
  assert.equal(payloads[0].keyId, "new");
  assert.equal(decryptPayload(payloads[0], ring, binding).toString(), "message");
});

test("AEAD supports previous reads and rejects altered envelopes", () => {
  const payload = encryptPayload(Buffer.from("legacy"), { activeKeyId: "old", keys: ring.keys }, binding);
  assert.equal(decryptPayload(payload, ring, binding).toString(), "legacy");
  assert.throws(() => decryptPayload({ ...payload, version: 2 }, ring, binding));
  assert.throws(() => decryptPayload({ ...payload, algorithm: "CBC" }, ring, binding));
  assert.throws(() => decryptPayload({ ...payload, keyId: "missing" }, ring, binding));
  assert.throws(() => decryptPayload(payload, ring, { ...binding, purpose: "audit" }));
});

test("security logging redacts sensitive fields", () => {
  assert.deepEqual(redact({ cookie: "session", sdp: "offer", safe: "status" }), { cookie: "[REDACTED]", sdp: "[REDACTED]", safe: "status" });
});
