export type RealtimeEventType =
  | "message.created"
  | "message.updated"
  | "message.deleted"
  | "message.reacted"
  | "message.pinned"
  | "conversation.added"
  | "conversation.updated"
  | "friend.updated"
  | "presence.updated"
  | "presence.count"
  | "read.updated"
  | "typing.started"
  | "typing.stopped"
  | "call.offered"
  | "call.answered"
  | "call.state"
  | "call.declined"
  | "call.ended"
  | "call.ice"
  | "call.renegotiate"
  | "call.renegotiate-answer";

export interface RealtimeEnvelope<T = unknown> {
  eventId: string;
  type: RealtimeEventType;
  entityId?: string;
  roomId?: string;
  actorId?: string;
  serverTimestamp: number;
  sequence?: number;
  revision?: number;
  payload: T;
  legacy: boolean;
}

const EVENT_TYPES: Record<string, RealtimeEventType> = {
  message: "message.created",
  edit: "message.updated",
  delete: "message.deleted",
  react: "message.reacted",
  pin: "message.pinned",
  "dm-added": "conversation.added",
  "dm-updated": "conversation.updated",
  "friend-state": "friend.updated",
  presence: "presence.updated",
  "online-count": "presence.count",
  read: "read.updated",
  "typing-start": "typing.started",
  "typing-stop": "typing.stopped",
  "call-offer": "call.offered",
  "call-answer": "call.answered",
  "call-state": "call.state",
  "call-decline": "call.declined",
  "call-ended": "call.ended",
  "ice-candidate": "call.ice",
  "call-renegotiate": "call.renegotiate",
  "call-renegotiate-answer": "call.renegotiate-answer",
};

const stableValue = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`).join(",")}}`;
};

const hash = (value: string) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
};

export const normalizeSocketEvent = (socketEvent: string, rawPayload: unknown): RealtimeEnvelope | null => {
  const type = EVENT_TYPES[socketEvent];
  if (!type) return null;
  const payload = rawPayload && typeof rawPayload === "object" ? rawPayload as Record<string, any> : {};
  const metadata = payload._event && typeof payload._event === "object" ? payload._event : null;
  const message = payload.message || (socketEvent === "message" ? payload : null);
  const dm = payload.dm;
  const roomId = payload.room || metadata?.conversationId;
  const entityId = metadata?.entityId || message?.id || dm?.id || payload.messageId || payload.user || payload.callId;
  const revision = Number.isSafeInteger(payload.revision) ? payload.revision : Number.isSafeInteger(metadata?.revision) ? metadata.revision : undefined;
  const parsedTimestamp = Date.parse(metadata?.serverTimestamp || "");
  const serverTimestamp = Number.isFinite(parsedTimestamp)
    ? parsedTimestamp
    : typeof payload.occurredAt === "number" ? payload.occurredAt
    : typeof message?.timestamp === "number" ? message.timestamp
    : Date.now();
  const eventId = typeof metadata?.eventId === "string" && metadata.eventId
    ? metadata.eventId
    : `legacy:${hash(stableValue({ type, entityId, roomId, revision, serverTimestamp: payload.occurredAt || message?.timestamp || payload.updatedAt, mutation: message?.clientMutationId, payload }))}`;
  return {
    eventId,
    type,
    entityId: entityId ? String(entityId) : undefined,
    roomId: roomId ? String(roomId) : undefined,
    actorId: metadata?.actorId || payload.from || payload.actor || payload.user,
    serverTimestamp,
    sequence: Number.isSafeInteger(metadata?.sequence) ? metadata.sequence : undefined,
    revision,
    payload: rawPayload,
    legacy: !metadata?.eventId,
  };
};
