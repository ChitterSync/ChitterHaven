import { createExternalStore, createStoreHook } from "./store";
export interface StoredConversation { id: string; users?: string[]; updatedAt?: number; lastActivityAt?: number; [key: string]: unknown }
interface State { byId: Record<string, StoredConversation>; order: string[]; requestEpoch: number; updatedAt: Record<string, number> }
const initial = (): State => ({ byId: {}, order: [], requestEpoch: 0, updatedAt: {} });
const base = createExternalStore(initial());
export const conversationStore = {
  ...base,
  beginRequest() { const epoch = base.getState().requestEpoch + 1; base.setState((state) => ({ ...state, requestEpoch: epoch })); return epoch; },
  mergeSnapshot(items: StoredConversation[], epoch: number, serverTimestamp = Date.now()) {
    base.setState((state) => {
      if (epoch !== state.requestEpoch) return state;
      let next = state;
      for (const item of items) next = merge(next, item, serverTimestamp);
      return next;
    });
  },
  upsert(item: StoredConversation, serverTimestamp = Date.now()) { base.setState((state) => merge(state, item, serverTimestamp)); },
  remove(id: string) { base.setState((state) => { const byId = { ...state.byId }; delete byId[id]; return { ...state, byId, order: state.order.filter((item) => item !== id) }; }); },
  touch(id: string, timestamp: number) { base.setState((state) => state.byId[id] ? merge(state, { ...state.byId[id], lastActivityAt: timestamp }, timestamp) : state); },
  markRead(id: string, lastReadMessageId?: string, timestamp = Date.now()) { base.setState((state) => state.byId[id] ? merge(state, { ...state.byId[id], unreadCount: 0, lastReadMessageId }, timestamp) : state); },
  reset() { base.setState(initial()); },
  selectAll() { const state = base.getState(); return state.order.map((id) => state.byId[id]).filter(Boolean); },
};
const merge = (state: State, item: StoredConversation, timestamp: number): State => {
  if (!item?.id || timestamp < (state.updatedAt[item.id] || 0)) return state;
  return { ...state, byId: { ...state.byId, [item.id]: { ...state.byId[item.id], ...item } }, order: state.order.includes(item.id) ? state.order : [...state.order, item.id], updatedAt: { ...state.updatedAt, [item.id]: timestamp } };
};
export const useConversationStore = createStoreHook(base);
