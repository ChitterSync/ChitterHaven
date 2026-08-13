import { io, type Socket } from "socket.io-client";
import { realtimeStatusStore } from "../stores/realtimeStatusStore";
import { RealtimeEventRouter, type CallEventAdapter, type TypingEventAdapter } from "./eventRouter";
import { normalizeSocketEvent, type RealtimeEnvelope } from "./eventTypes";

export type RealtimeConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "offline";
export type ReconcileReason = "initial" | "connected" | "reconnected" | "online" | "visible" | "wake" | "sequence-gap";
export type RealtimeDiagnostics = {
  connectionState: RealtimeConnectionState;
  sessionId: string;
  lastReceivedEventId: string | null;
  lastServerSequence: number;
  lastSuccessfulReconciliation: string | null;
  syncCursor: string | null;
  subscriptionCount: number;
  reconnectAttempts: number;
  desiredRooms: string[];
  currentSocketId: string | null;
  listenerRegistrationCount: number;
  processedEventCount: number;
  duplicateEventCount: number;
  lastEvent: unknown;
  lastReconnectAt: number | null;
};

type Reconciler = (reason: ReconcileReason) => Promise<void> | void;
type StatusListener = (diagnostics: RealtimeDiagnostics) => void;
type SocketFactory = () => Socket;
const DOMAIN_EVENTS = ["friend-state", "message", "dm-added", "dm-updated", "react", "pin", "edit", "delete", "read", "presence", "online-count", "typing-start", "typing-stop", "call-offer", "call-answer", "ice-candidate", "call-state", "call-decline", "call-ended", "call-renegotiate", "call-renegotiate-answer"] as const;

export class RealtimeManager {
  private socket: Socket | null = null;
  private state: RealtimeConnectionState = "disconnected";
  private sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  private router = new RealtimeEventRouter();
  private reconcilers = new Set<Reconciler>();
  private statusListeners = new Set<StatusListener>();
  private desiredRooms = new Set<string>();
  private channel: BroadcastChannel | null = null;
  private lastSuccessfulReconciliation: string | null = null;
  private syncCursor: string | null = null;
  private lastServerSequence = 0;
  private cursorPersistTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private connectedOnce = false;
  private lastActivityAt = Date.now();
  private lifecycleBound = false;
  private identity: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private listenerRegistrationCount = 0;
  private lastReconnectAt: number | null = null;

  constructor(private readonly socketFactory: SocketFactory = () => io({ path: "/api/socketio", autoConnect: false, reconnection: true, reconnectionDelay: 750, reconnectionDelayMax: 15_000, randomizationFactor: 0.5, timeout: 20_000 })) {}

  setIdentity(identity: string) {
    if (this.identity === identity) return;
    if (this.identity) {
      this.disconnect();
      this.desiredRooms.clear();
      this.router.resetForIdentityChange();
    }
    this.identity = identity;
    if (typeof localStorage !== "undefined") {
      const stored = Number(localStorage.getItem(`ch:realtime-cursor:${identity}`) || 0);
      this.lastServerSequence = Number.isSafeInteger(stored) && stored > 0 ? stored : 0;
      this.syncCursor = this.lastServerSequence ? String(this.lastServerSequence) : null;
    }
    this.publishStatus();
  }
  getSocket() { if (!this.socket) this.createSocket(); return this.socket!; }
  subscribeCallEvents(adapter: CallEventAdapter) { return this.router.subscribeCalls(adapter); }
  subscribeTypingEvents(adapter: TypingEventAdapter) { return this.router.subscribeTyping(adapter); }
  joinRoom(roomId: string) { if (!roomId || this.desiredRooms.has(roomId)) return; this.desiredRooms.add(roomId); if (this.socket?.connected) this.socket.emit("join-room", roomId); this.publishStatus(); }
  leaveRoom(roomId: string) { if (!this.desiredRooms.delete(roomId)) return; if (this.socket?.connected) this.socket.emit("leave-room", roomId); this.publishStatus(); }
  setDesiredRooms(roomIds: Iterable<string>) { const next = new Set(Array.from(roomIds).filter(Boolean)); for (const room of this.desiredRooms) if (!next.has(room)) this.leaveRoom(room); for (const room of next) this.joinRoom(room); }
  getDesiredRooms() { return Array.from(this.desiredRooms).sort(); }
  restoreDesiredRooms() { if (!this.socket?.connected) return; this.getDesiredRooms().forEach((room) => this.socket!.emit("join-room", room)); }

  getDiagnostics(): RealtimeDiagnostics {
    const router = this.router.getDiagnostics();
    return { connectionState: this.state, sessionId: this.sessionId, lastReceivedEventId: router.lastEvent?.eventId || null, lastServerSequence: this.lastServerSequence, lastSuccessfulReconciliation: this.lastSuccessfulReconciliation, syncCursor: this.syncCursor, subscriptionCount: this.statusListeners.size + this.reconcilers.size, reconnectAttempts: this.reconnectAttempts, desiredRooms: this.getDesiredRooms(), currentSocketId: this.socket?.id || null, listenerRegistrationCount: this.listenerRegistrationCount, processedEventCount: router.processedEventCount, duplicateEventCount: router.duplicateEventCount, lastEvent: router.lastEvent, lastReconnectAt: this.lastReconnectAt };
  }
  registerReconciler(reconciler: Reconciler) { this.reconcilers.add(reconciler); return () => { this.reconcilers.delete(reconciler); }; }
  subscribeStatus(listener: StatusListener) { this.statusListeners.add(listener); listener(this.getDiagnostics()); return () => { this.statusListeners.delete(listener); }; }
  setSyncCursor(cursor: string | null) { const sequence = Number(cursor || 0); if (Number.isSafeInteger(sequence) && sequence >= this.lastServerSequence) this.advanceCursor(sequence); }
  async reconcile(reason: ReconcileReason) {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    try {
      let latestSequence = this.lastServerSequence;
      const rooms = encodeURIComponent(this.getDesiredRooms().join(","));
      const response = await fetch(`/api/realtime-sync?cursor=${encodeURIComponent(String(this.lastServerSequence))}&rooms=${rooms}`, { cache: "no-store" });
      if (response.ok) {
        const sync = await response.json();
        const parsed = Number(sync?.latestSequence || 0);
        if (Number.isSafeInteger(parsed)) latestSequence = Math.max(latestSequence, parsed);
      }
      await Promise.all(Array.from(this.reconcilers, (reconciler) => reconciler(reason)));
      this.advanceCursor(latestSequence);
      this.lastSuccessfulReconciliation = new Date().toISOString();
      this.publishStatus();
    } catch {}
  }
  disconnect() { this.stopHeartbeat(); if (this.cursorPersistTimer) clearTimeout(this.cursorPersistTimer); this.cursorPersistTimer = null; this.socket?.removeAllListeners(); this.socket?.disconnect(); this.socket = null; this.connectedOnce = false; this.listenerRegistrationCount = 0; this.setState("disconnected"); }

  private createSocket() {
    this.bindLifecycle();
    this.setState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "connecting");
    const socket = this.socketFactory();
    this.socket = socket;
    socket.on("connect", () => { const reason: ReconcileReason = this.connectedOnce ? "reconnected" : "connected"; if (this.connectedOnce) this.lastReconnectAt = Date.now(); this.connectedOnce = true; this.reconnectAttempts = 0; this.setState("connected"); this.startHeartbeat(); this.restoreDesiredRooms(); this.router.resetTyping(); void this.reconcile(reason); });
    socket.on("disconnect", () => { this.stopHeartbeat(); this.router.resetTyping(); this.setState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "reconnecting"); });
    socket.io.on("reconnect_attempt", (attempt) => { this.reconnectAttempts = attempt; this.setState("reconnecting"); });
    DOMAIN_EVENTS.forEach((eventName) => socket.on(eventName, (payload: unknown) => { const event = normalizeSocketEvent(eventName, payload); if (event) this.handleEnvelope(event, true); }));
    this.listenerRegistrationCount = DOMAIN_EVENTS.length + 3;
    if (typeof navigator === "undefined" || navigator.onLine) socket.connect();
  }
  private bindLifecycle() {
    if (this.lifecycleBound || typeof window === "undefined") return;
    this.lifecycleBound = true;
    this.channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("chitterhaven-realtime") : null;
    this.channel?.addEventListener("message", (event) => {
      if (event.data?.sessionId === this.sessionId) return;
      if (event.data?.type === "status") this.lastActivityAt = Date.now();
      if (event.data?.type === "domain-event" && event.data.identity === this.identity && event.data.envelope) this.handleEnvelope(event.data.envelope, false);
      if (event.data?.type === "logout") { this.desiredRooms.clear(); this.router.resetForIdentityChange(); this.disconnect(); }
    });
    window.addEventListener("offline", () => { this.stopHeartbeat(); this.setState("offline"); this.socket?.disconnect(); });
    window.addEventListener("online", () => { this.setState("connecting"); this.getSocket().connect(); void this.reconcile("online"); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "visible") return; const slept = Date.now() - this.lastActivityAt > 45_000; if (!this.socket?.connected) this.getSocket().connect(); void this.reconcile(slept ? "wake" : "visible"); });
  }
  private startHeartbeat() { this.stopHeartbeat(); const send = () => this.socket?.connected && this.socket.emit("presence-heartbeat", {}); send(); this.heartbeatTimer = setInterval(send, 25_000); (this.heartbeatTimer as any).unref?.(); }
  private stopHeartbeat() { if (this.heartbeatTimer) clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  private setState(state: RealtimeConnectionState) { if (this.state === state) return; this.state = state; realtimeStatusStore.setConnection(state, this.reconnectAttempts); this.publishStatus(); }
  private handleEnvelope(event: RealtimeEnvelope, broadcast: boolean) {
    const previousSequence = this.lastServerSequence;
    if (!this.router.dispatch(event)) return;
    if (event.sequence && Number.isSafeInteger(event.sequence)) {
      if (previousSequence > 0 && event.sequence > previousSequence + 1) void this.checkSequenceGap(previousSequence, event.sequence);
      this.advanceCursor(event.sequence);
    }
    this.lastActivityAt = Date.now();
    if (broadcast) this.channel?.postMessage({ type: "domain-event", sessionId: this.sessionId, identity: this.identity, envelope: event });
    this.publishStatus();
  }
  private advanceCursor(sequence: number) {
    if (!Number.isSafeInteger(sequence) || sequence <= this.lastServerSequence) return;
    this.lastServerSequence = sequence;
    this.syncCursor = String(sequence);
    if (this.identity && typeof localStorage !== "undefined") localStorage.setItem(`ch:realtime-cursor:${this.identity}`, this.syncCursor);
    if (this.cursorPersistTimer) clearTimeout(this.cursorPersistTimer);
    this.cursorPersistTimer = setTimeout(() => {
      this.cursorPersistTimer = null;
      if (!this.identity) return;
      void fetch("/api/realtime-sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: this.sessionId, lastSequence: this.syncCursor }) }).catch(() => {});
    }, 500);
  }
  private async checkSequenceGap(previousSequence: number, receivedSequence: number) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      const rooms = encodeURIComponent(this.getDesiredRooms().join(","));
      const response = await fetch(`/api/realtime-sync?cursor=${previousSequence}&before=${receivedSequence}&rooms=${rooms}`, { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      if (Number(result?.missingCount || 0) > 0) void this.reconcile("sequence-gap");
    } catch {}
  }
  private publishStatus() { const diagnostics = this.getDiagnostics(); this.statusListeners.forEach((listener) => listener(diagnostics)); this.channel?.postMessage({ type: "status", sessionId: this.sessionId, diagnostics }); if (typeof window !== "undefined") (window as any).__CHITTERHAVEN_REALTIME__ = diagnostics; }
}

let singleton: RealtimeManager | null = null;
export const getRealtimeManager = () => singleton ||= new RealtimeManager();
