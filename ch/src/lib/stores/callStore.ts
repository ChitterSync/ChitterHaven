import { createExternalStore, createStoreHook } from "./store";

export interface StoredCall {
  room: string;
  state: "idle" | "calling" | "in-call";
  from?: string;
  startedAt?: number;
  participants: unknown[];
  revision?: number;
  updatedAt: number;
}

interface State { byRoom: Record<string, StoredCall> }
const initial = (): State => ({ byRoom: {} });
const base = createExternalStore(initial());

export const callStore = {
  ...base,
  merge(payload: Partial<StoredCall> & { room?: string }, updatedAt = Date.now(), revision?: number) {
    if (!payload.room) return;
    base.setState((state) => {
      const current = state.byRoom[payload.room!];
      const nextRevision = revision ?? payload.revision;
      if (current?.revision !== undefined && nextRevision !== undefined && nextRevision < current.revision) return state;
      const byRoom = { ...state.byRoom };
      if (payload.state === "idle" || (Array.isArray(payload.participants) && payload.participants.length === 0)) delete byRoom[payload.room!];
      else byRoom[payload.room!] = { ...current, ...payload, room: payload.room!, state: payload.state || current?.state || "calling", participants: payload.participants || current?.participants || [], revision: nextRevision, updatedAt };
      return { byRoom };
    });
  },
  remove(room: string) { base.setState((state) => { const byRoom = { ...state.byRoom }; delete byRoom[room]; return { byRoom }; }); },
  reset() { base.setState(initial()); },
};

export const useCallStore = createStoreHook(base);
