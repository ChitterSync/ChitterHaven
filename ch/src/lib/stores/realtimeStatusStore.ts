import { createExternalStore, createStoreHook } from "./store";
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "offline";
export interface RealtimeStatusState { connectionState: ConnectionState; lastConnectedAt: number | null; lastDisconnectedAt: number | null; reconnectAttempt: number; lastEventAt: number | null }
const initial = (): RealtimeStatusState => ({ connectionState: "disconnected", lastConnectedAt: null, lastDisconnectedAt: null, reconnectAttempt: 0, lastEventAt: null });
const base = createExternalStore(initial());
export const realtimeStatusStore = {
  ...base,
  setConnection(connectionState: ConnectionState, reconnectAttempt = base.getState().reconnectAttempt) { const now = Date.now(); base.setState((state) => ({ ...state, connectionState, reconnectAttempt, lastConnectedAt: connectionState === "connected" ? now : state.lastConnectedAt, lastDisconnectedAt: connectionState === "disconnected" || connectionState === "offline" || connectionState === "reconnecting" ? now : state.lastDisconnectedAt })); },
  markEvent(timestamp: number) { base.setState((state) => ({ ...state, lastEventAt: timestamp })); },
  reset() { base.setState(initial()); },
};
export const useRealtimeStatusStore = createStoreHook(base);
