import { createExternalStore, createStoreHook } from "./store";

export interface StoredMessage {
  id: string;
  timestamp?: number;
  clientMutationId?: string;
  deliveryState?: string;
  [key: string]: unknown;
}

interface EntityMetadata { serverTimestamp?: number; revision?: number }
interface MessageStoreState {
  byId: Record<string, StoredMessage>;
  idsByRoom: Record<string, string[]>;
  roomVersions: Record<string, number>;
  roomRequestEpochs: Record<string, number>;
  entityUpdatedAt: Record<string, number>;
  entityRevisions: Record<string, number>;
  deletedIds: Record<string, number>;
}

const initialState = (): MessageStoreState => ({ byId: {}, idsByRoom: {}, roomVersions: {}, roomRequestEpochs: {}, entityUpdatedAt: {}, entityRevisions: {}, deletedIds: {} });
const base = createExternalStore(initialState());
const sortIds = (ids: string[], byId: Record<string, StoredMessage>) => Array.from(new Set(ids)).filter((id) => byId[id]).sort((a, b) => {
  const difference = Number(byId[a]?.timestamp || 0) - Number(byId[b]?.timestamp || 0);
  return difference || a.localeCompare(b);
});
const accepts = (state: MessageStoreState, id: string, metadata?: EntityMetadata) => {
  const revision = metadata?.revision;
  if (revision !== undefined && revision < (state.entityRevisions[id] || 0)) return false;
  const timestamp = metadata?.serverTimestamp;
  return timestamp === undefined || timestamp >= (state.entityUpdatedAt[id] || 0);
};

export const messageStore = {
  ...base,
  beginHistoryRequest(roomId: string) {
    let epoch = 0;
    base.setState((state) => {
      epoch = (state.roomRequestEpochs[roomId] || 0) + 1;
      return { ...state, roomRequestEpochs: { ...state.roomRequestEpochs, [roomId]: epoch } };
    });
    return epoch;
  },
  mergeHistory(roomId: string, messages: StoredMessage[], requestEpoch: number, metadata?: EntityMetadata) {
    base.setState((state) => {
      if (requestEpoch !== state.roomRequestEpochs[roomId]) return state;
      const byId = { ...state.byId };
      const updatedAt = { ...state.entityUpdatedAt };
      const revisions = { ...state.entityRevisions };
      const responseStartedAt = metadata?.serverTimestamp || 0;
      for (const message of messages) {
        if (!message?.id || state.deletedIds[message.id] > responseStartedAt || !accepts(state, message.id, metadata)) continue;
        byId[message.id] = { ...byId[message.id], ...message };
        updatedAt[message.id] = Math.max(updatedAt[message.id] || 0, metadata?.serverTimestamp || Number(message.timestamp || 0));
        if (metadata?.revision !== undefined) revisions[message.id] = metadata.revision;
      }
      const existing = state.idsByRoom[roomId] || [];
      const ids = sortIds([...existing, ...messages.map((message) => message.id)], byId);
      return { ...state, byId, entityUpdatedAt: updatedAt, entityRevisions: revisions, idsByRoom: { ...state.idsByRoom, [roomId]: ids }, roomVersions: { ...state.roomVersions, [roomId]: Math.max(state.roomVersions[roomId] || 0, metadata?.revision || 0) } };
    });
  },
  upsertMessage(roomId: string, message: StoredMessage, metadata?: EntityMetadata) {
    if (!message?.id) return;
    base.setState((state) => {
      if (!accepts(state, message.id, metadata)) return state;
      const byId = { ...state.byId, [message.id]: { ...state.byId[message.id], ...message } };
      const ids = sortIds([...(state.idsByRoom[roomId] || []), message.id], byId);
      return { ...state, byId, idsByRoom: { ...state.idsByRoom, [roomId]: ids }, entityUpdatedAt: { ...state.entityUpdatedAt, [message.id]: metadata?.serverTimestamp || Date.now() }, entityRevisions: metadata?.revision === undefined ? state.entityRevisions : { ...state.entityRevisions, [message.id]: metadata.revision } };
    });
  },
  updateMessage(roomId: string, message: StoredMessage, metadata?: EntityMetadata) { this.upsertMessage(roomId, message, metadata); },
  deleteMessage(roomId: string, messageId: string, metadata?: EntityMetadata) {
    base.setState((state) => {
      if (!accepts(state, messageId, metadata)) return state;
      const byId = { ...state.byId }; delete byId[messageId];
      return { ...state, byId, idsByRoom: { ...state.idsByRoom, [roomId]: (state.idsByRoom[roomId] || []).filter((id) => id !== messageId) }, deletedIds: { ...state.deletedIds, [messageId]: metadata?.serverTimestamp || Date.now() } };
    });
  },
  markRead(roomId: string, userId: string, messageId?: string, metadata?: EntityMetadata) {
    if (!messageId) return;
    base.setState((state) => {
      const message = state.byId[messageId];
      if (!message || !(state.idsByRoom[roomId] || []).includes(messageId) || !accepts(state, messageId, metadata)) return state;
      const readBy = Array.from(new Set([...(Array.isArray(message.readBy) ? message.readBy.filter((item): item is string => typeof item === "string") : []), userId]));
      return { ...state, byId: { ...state.byId, [messageId]: { ...message, readBy } }, entityUpdatedAt: { ...state.entityUpdatedAt, [messageId]: metadata?.serverTimestamp || Date.now() } };
    });
  },
  clearRoom(roomId: string) { base.setState((state) => ({ ...state, idsByRoom: { ...state.idsByRoom, [roomId]: [] } })); },
  reset() { base.setState(initialState()); },
  selectRoom(roomId: string | null) { const state = base.getState(); return roomId ? (state.idsByRoom[roomId] || []).map((id) => state.byId[id]).filter(Boolean) : []; },
};
export const useMessageStore = createStoreHook(base);
