import test from "node:test";
import assert from "node:assert/strict";
import { aggregatePresence, expirePresenceSessions, type PresenceSession } from "../src/lib/realtime/presenceState";

test("presence expires after an unclean disconnect misses the heartbeat timeout", () => {
  const sessions = new Map<string, PresenceSession>([["device-a", { username: "alice", status: "online", lastHeartbeat: 1_000 }]]);
  const affected = expirePresenceSessions(sessions, 77_000, 75_000);
  assert.equal(affected.has("alice"), true);
  assert.equal(aggregatePresence(sessions, "alice"), "offline");
});

test("one expired device does not mark a multi-device user offline", () => {
  const sessions = new Map<string, PresenceSession>([
    ["device-a", { username: "alice", status: "online", lastHeartbeat: 1_000 }],
    ["device-b", { username: "alice", status: "online", lastHeartbeat: 70_000 }],
  ]);
  expirePresenceSessions(sessions, 77_000, 75_000);
  assert.equal(aggregatePresence(sessions, "alice"), "online");
});

test("presence aggregation prefers an online session", () => {
  const sessions = new Map<string, PresenceSession>([
    ["device-a", { username: "alice", status: "away", lastHeartbeat: 10 }],
    ["device-b", { username: "alice", status: "online", lastHeartbeat: 10 }],
  ]);
  assert.equal(aggregatePresence(sessions, "alice"), "online");
});
