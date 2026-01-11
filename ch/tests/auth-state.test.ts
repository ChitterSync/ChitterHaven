import test from "node:test";
import assert from "node:assert/strict";
import { createState, isValidState } from "../src/lib/auth/state";

test("state validation only succeeds on exact match", () => {
  const state = createState();
  assert.equal(isValidState(state, state), true);
  assert.equal(isValidState(state, `${state}x`), false);
  assert.equal(isValidState(state, null), false);
});
