import test from "node:test";
import assert from "node:assert/strict";
import { messageStore } from "../src/lib/stores/messageStore";
import { presenceStore } from "../src/lib/stores/presenceStore";
import { RealtimeEventRouter } from "../src/lib/realtime/eventRouter";
import { callStore } from "../src/lib/stores/callStore";
import { userStore } from "../src/lib/stores/userStore";
import { normalizeSocketEvent } from "../src/lib/realtime/eventTypes";

test.beforeEach(() => { messageStore.reset(); presenceStore.reset(); callStore.reset(); userStore.reset(); });

test("history response preserves a realtime message received in flight and ordering", () => {
  const epoch = messageStore.beginHistoryRequest("haven__general");
  messageStore.upsertMessage("haven__general", { id: "realtime", timestamp: 20 }, { serverTimestamp: 200 });
  messageStore.mergeHistory("haven__general", [{ id: "history", timestamp: 10 }], epoch, { serverTimestamp: 100 });
  assert.deepEqual(messageStore.selectRoom("haven__general").map((message) => message.id), ["history", "realtime"]);
});

test("an older history request cannot overwrite a newer response", () => {
  const requestA = messageStore.beginHistoryRequest("dm");
  const requestB = messageStore.beginHistoryRequest("dm");
  messageStore.mergeHistory("dm", [{ id: "new", timestamp: 2 }], requestB, { serverTimestamp: 200 });
  messageStore.mergeHistory("dm", [{ id: "old", timestamp: 1 }], requestA, { serverTimestamp: 100 });
  assert.deepEqual(messageStore.selectRoom("dm").map((message) => message.id), ["new"]);
});

test("duplicate normalized message event is applied once", () => {
  const router = new RealtimeEventRouter();
  const event = { eventId: "same", type: "message.created" as const, roomId: "dm", entityId: "m1", serverTimestamp: 100, payload: { id: "m1", timestamp: 1 }, legacy: false };
  router.dispatch(event); router.dispatch(event);
  assert.deepEqual(messageStore.selectRoom("dm").map((message) => message.id), ["m1"]);
  assert.equal(router.getDiagnostics().duplicateEventCount, 1);
});

test("a stale history snapshot cannot overwrite a newer realtime edit", () => {
  const epoch = messageStore.beginHistoryRequest("dm");
  messageStore.upsertMessage("dm", { id: "m1", text: "new", timestamp: 1 }, { serverTimestamp: 200 });
  messageStore.mergeHistory("dm", [{ id: "m1", text: "old", timestamp: 1 }], epoch, { serverTimestamp: 100 });
  assert.equal(messageStore.selectRoom("dm")[0].text, "new");
});

test("older HTTP presence cannot overwrite realtime presence", () => {
  presenceStore.mergeRealtime({ user: "bird", status: "online" }, 200);
  presenceStore.mergeHttp({ statuses: { bird: "offline" } }, 100);
  assert.equal(presenceStore.statusMap().bird, "online");
});

test("call snapshots reject an older revision and clear idle calls", () => {
  callStore.merge({ room: "dm", state: "in-call", participants: [{ user: "bird" }] }, 200, 2);
  callStore.merge({ room: "dm", state: "calling", participants: [{ user: "bird" }] }, 100, 1);
  assert.equal(callStore.getState().byRoom.dm.state, "in-call");
  callStore.merge({ room: "dm", state: "idle", participants: [] }, 300, 3);
  assert.equal(callStore.getState().byRoom.dm, undefined);
});

test("user entities reject stale profile responses", () => {
  userStore.upsert("bird", { displayName: "New", avatarUrl: "/new.png" }, 200);
  userStore.upsert("bird", { displayName: "Old", avatarUrl: "/old.png" }, 100);
  assert.equal(userStore.getState().byId.bird.displayName, "New");
});

test("socket metadata carries the durable server sequence into normalized events", () => {
  const event = normalizeSocketEvent("message", { id: "m1", room: "dm", timestamp: 10, _event: { eventId: "e1", type: "message.created", sequence: 42, serverTimestamp: new Date(10).toISOString() } });
  assert.equal(event?.sequence, 42);
});
