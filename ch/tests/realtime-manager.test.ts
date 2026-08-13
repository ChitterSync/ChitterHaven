import test from "node:test";
import assert from "node:assert/strict";
import type { Socket } from "socket.io-client";
import { RealtimeManager } from "../src/lib/realtime/manager";
import { conversationStore } from "../src/lib/stores/conversationStore";
import { messageStore } from "../src/lib/stores/messageStore";

class FakeSocket {
  id = "socket-1";
  connected = false;
  handlers = new Map<string, Set<(...args: any[]) => void>>();
  emitted: Array<[string, ...any[]]> = [];
  io = { engine: { transport: { name: "websocket" } }, on: (event: string, handler: (...args: any[]) => void) => this.on(`io:${event}`, handler) };
  on(event: string, handler: (...args: any[]) => void) { const set = this.handlers.get(event) || new Set(); set.add(handler); this.handlers.set(event, set); return this; }
  emit(event: string, ...args: any[]) { this.emitted.push([event, ...args]); return this; }
  connect() { this.connected = true; this.trigger("connect"); return this; }
  disconnect() { this.connected = false; this.trigger("disconnect", "client disconnect"); return this; }
  removeAllListeners() { this.handlers.clear(); return this; }
  trigger(event: string, ...args: any[]) { this.handlers.get(event)?.forEach((handler) => handler(...args)); }
}

test("desired rooms including a Haven channel restore once after reconnect", () => {
  const socket = new FakeSocket();
  const manager = new RealtimeManager(() => socket as unknown as Socket);
  manager.setIdentity("bird");
  manager.setDesiredRooms(["dm-1", "ChitterHaven__general", "call-room"]);
  manager.getSocket();
  socket.emitted.length = 0;
  socket.connected = false; socket.trigger("disconnect", "transport close");
  socket.connected = true; socket.trigger("connect");
  const joined = socket.emitted.filter(([event]) => event === "join-room").map(([, room]) => room);
  assert.deepEqual(joined.sort(), ["ChitterHaven__general", "call-room", "dm-1"]);
});

test("leaving removes room intent and it is not restored", () => {
  const socket = new FakeSocket();
  const manager = new RealtimeManager(() => socket as unknown as Socket);
  manager.setIdentity("bird"); manager.getSocket(); socket.connect(); manager.setDesiredRooms(["dm-1", "dm-2"]);
  socket.emitted.length = 0; manager.leaveRoom("dm-1");
  assert.deepEqual(socket.emitted[0], ["leave-room", "dm-1"]);
  socket.emitted.length = 0; socket.trigger("connect");
  assert.deepEqual(socket.emitted.filter(([event]) => event === "join-room").map(([, room]) => room), ["dm-2"]);
});

test("repeated initialization registers each physical event once", () => {
  const socket = new FakeSocket();
  const manager = new RealtimeManager(() => socket as unknown as Socket);
  manager.setIdentity("bird"); manager.getSocket(); manager.getSocket(); manager.getSocket();
  for (const handlers of socket.handlers.values()) assert.equal(handlers.size, 1);
});

test("identity change clears rooms, stores, and old listeners", () => {
  const sockets = [new FakeSocket(), new FakeSocket()]; let index = 0;
  const manager = new RealtimeManager(() => sockets[index++] as unknown as Socket);
  manager.setIdentity("user-a"); manager.setDesiredRooms(["a-room"]); manager.getSocket();
  messageStore.upsertMessage("a-room", { id: "secret" }); conversationStore.upsert({ id: "a-room" });
  manager.setIdentity("user-b"); manager.getSocket();
  assert.deepEqual(manager.getDesiredRooms(), []);
  assert.deepEqual(messageStore.selectRoom("a-room"), []);
  assert.deepEqual(conversationStore.selectAll(), []);
  assert.equal(sockets[0].handlers.size, 0);
  assert.ok(sockets[1].handlers.size > 0);
});
