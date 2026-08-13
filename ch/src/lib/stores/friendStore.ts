import { createExternalStore, createStoreHook } from "./store";
export interface FriendSnapshot { friends: string[]; incoming: string[]; outgoing: string[] }
interface State extends FriendSnapshot { requestEpoch: number; updatedAt: number }
const empty = (): State => ({ friends: [], incoming: [], outgoing: [], requestEpoch: 0, updatedAt: 0 });
const base = createExternalStore(empty());
const unique = (items: unknown) => Array.from(new Set(Array.isArray(items) ? items.filter((item): item is string => typeof item === "string") : []));
export const friendStore = {
  ...base,
  beginRequest() { const epoch = base.getState().requestEpoch + 1; base.setState((state) => ({ ...state, requestEpoch: epoch })); return epoch; },
  applySnapshot(snapshot: Partial<FriendSnapshot>, epoch: number, timestamp = Date.now()) {
    base.setState((state) => epoch !== state.requestEpoch || timestamp < state.updatedAt ? state : ({ ...state, friends: unique(snapshot.friends), incoming: unique(snapshot.incoming), outgoing: unique(snapshot.outgoing), updatedAt: timestamp }));
  },
  applyRealtime(snapshot: Partial<FriendSnapshot>, timestamp = Date.now()) {
    base.setState((state) => timestamp < state.updatedAt ? state : ({ ...state, friends: unique(snapshot.friends), incoming: unique(snapshot.incoming), outgoing: unique(snapshot.outgoing), updatedAt: timestamp }));
  },
  reset() { base.setState(empty()); },
};
export const useFriendStore = createStoreHook(base);
