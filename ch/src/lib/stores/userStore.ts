import { createExternalStore, createStoreHook } from "./store";

export interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  updatedAt: number;
}

interface State { byId: Record<string, StoredUser> }
const initial = (): State => ({ byId: {} });
const base = createExternalStore(initial());

export const userStore = {
  ...base,
  upsert(username: string, profile: Partial<Omit<StoredUser, "id" | "username">>, updatedAt = Date.now()) {
    if (!username) return;
    base.setState((state) => {
      const current = state.byId[username];
      if (current && updatedAt < current.updatedAt) return state;
      return { ...state, byId: { ...state.byId, [username]: { id: username, username, displayName: profile.displayName || current?.displayName || username, avatarUrl: profile.avatarUrl ?? current?.avatarUrl ?? "", updatedAt } } };
    });
  },
  reset() { base.setState(initial()); },
};

export const useUserStore = createStoreHook(base);
