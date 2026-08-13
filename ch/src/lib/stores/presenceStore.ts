import { createExternalStore, createStoreHook } from "./store";
export interface UserPresence { userId: string; connected: boolean | null; selectedStatus?: string; effectiveStatus?: string; statusMessage?: string; richPresence?: unknown; lastSeenAt?: number | null; updatedAt: number; revision?: number; source: "http" | "realtime" }
interface State { byUserId: Record<string, UserPresence>; onlineCount: number }
const initial = (): State => ({ byUserId: {}, onlineCount: 1 });
const base = createExternalStore(initial());
const mergeOne = (state: State, update: UserPresence): State => {
  const current = state.byUserId[update.userId];
  if (current?.revision !== undefined && update.revision !== undefined && update.revision < current.revision) return state;
  if (current && update.updatedAt < current.updatedAt) return state;
  if (current && update.updatedAt === current.updatedAt && current.source === "realtime" && update.source === "http") return state;
  return { ...state, byUserId: { ...state.byUserId, [update.userId]: { ...current, ...update } } };
};
export const presenceStore = {
  ...base,
  mergeRealtime(payload: any, timestamp = Date.now(), revision?: number) {
    if (!payload?.user) return;
    const effectiveStatus = String(payload.status || "offline");
    base.setState((state) => mergeOne(state, { userId: payload.user, connected: effectiveStatus !== "offline", effectiveStatus, lastSeenAt: payload.lastSeen ? Date.parse(payload.lastSeen) : undefined, updatedAt: timestamp, revision, source: "realtime" }));
  },
  mergeHttp(payload: any, requestStartedAt: number) {
    base.setState((starting) => {
      let state = starting;
      const users = new Set([...Object.keys(payload?.statuses || {}), ...Object.keys(payload?.statusMessages || {}), ...Object.keys(payload?.richPresence || {})]);
      users.forEach((userId) => {
        state = mergeOne(state, { userId, connected: payload?.statuses?.[userId] ? payload.statuses[userId] !== "offline" : null, selectedStatus: payload?.statuses?.[userId], effectiveStatus: payload?.statuses?.[userId], statusMessage: payload?.statusMessages?.[userId], richPresence: payload?.richPresence?.[userId], lastSeenAt: payload?.lastSeen?.[userId] ? Date.parse(payload.lastSeen[userId]) : undefined, updatedAt: requestStartedAt, source: "http" });
      });
      return state;
    });
  },
  setOnlineCount(count: number) { if (Number.isFinite(count)) base.setState((state) => ({ ...state, onlineCount: count })); },
  reset() { base.setState(initial()); },
  statusMap() { return Object.fromEntries(Object.values(base.getState().byUserId).map((item) => [item.userId, item.effectiveStatus || "offline"])); },
  statusMessageMap() { return Object.fromEntries(Object.values(base.getState().byUserId).filter((item) => item.statusMessage).map((item) => [item.userId, item.statusMessage!])); },
  richPresenceMap() { return Object.fromEntries(Object.values(base.getState().byUserId).filter((item) => item.richPresence).map((item) => [item.userId, item.richPresence])); },
};
export const usePresenceStore = createStoreHook(base);
