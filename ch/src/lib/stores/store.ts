import { useSyncExternalStore } from "react";

export const createExternalStore = <T>(initialState: T) => {
  let state = initialState;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState: (next: T | ((current: T) => T)) => {
      state = typeof next === "function" ? (next as (current: T) => T)(state) : next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
};

export const createStoreHook = <T>(store: { getState(): T; subscribe(listener: () => void): () => void }) =>
  () => useSyncExternalStore(store.subscribe, store.getState, store.getState);
