import test from "node:test";
import assert from "node:assert/strict";
import { RealtimeEventTracker } from "../src/lib/realtime/eventTracker";

test("duplicate realtime events are rejected", () => {
  const tracker = new RealtimeEventTracker();
  assert.equal(tracker.observe({ eventId: "event-1", sequence: 1 }).duplicate, false);
  assert.equal(tracker.observe({ eventId: "event-1", sequence: 1 }).duplicate, true);
});

test("late events do not roll the server sequence backward", () => {
  const tracker = new RealtimeEventTracker();
  tracker.observe({ eventId: "event-3", sequence: 3 });
  const late = tracker.observe({ eventId: "event-2", sequence: 2 });
  assert.equal(late.gap, false);
  assert.equal(tracker.getLastSequence(), 3);
});

test("a forward sequence gap is detected", () => {
  const tracker = new RealtimeEventTracker();
  tracker.observe({ eventId: "event-4", sequence: 4 });
  assert.equal(tracker.observe({ eventId: "event-7", sequence: 7 }).gap, true);
});

test("bounded deduplication evicts the oldest event", () => {
  const tracker = new RealtimeEventTracker(2);
  tracker.observe({ eventId: "event-1" });
  tracker.observe({ eventId: "event-2" });
  tracker.observe({ eventId: "event-3" });
  assert.equal(tracker.observe({ eventId: "event-1" }).duplicate, false);
});
