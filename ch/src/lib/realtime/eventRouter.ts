import { conversationStore } from "../stores/conversationStore";
import { friendStore } from "../stores/friendStore";
import { messageStore } from "../stores/messageStore";
import { presenceStore } from "../stores/presenceStore";
import { realtimeStatusStore } from "../stores/realtimeStatusStore";
import { callStore } from "../stores/callStore";
import { userStore } from "../stores/userStore";
import { EventDeduplicator } from "./eventDeduplicator";
import type { RealtimeEnvelope } from "./eventTypes";

export interface CallEventAdapter { onOffer(payload: any): void; onAnswer(payload: any): void; onIceCandidate(payload: any): void; onState(payload: any): void; onDecline(payload: any): void; onEnded(payload: any): void; onRenegotiate(payload: any): void; onRenegotiateAnswer(payload: any): void }
export interface TypingEventAdapter { onStart(payload: any): void; onStop(payload: any): void; onReset(): void }

export class RealtimeEventRouter {
  private deduplicator = new EventDeduplicator();
  private callAdapters = new Set<CallEventAdapter>();
  private typingAdapters = new Set<TypingEventAdapter>();
  private processedCount = 0;
  private lastEvent: Pick<RealtimeEnvelope, "eventId" | "type" | "serverTimestamp"> | null = null;

  dispatch(event: RealtimeEnvelope) {
    if (!this.deduplicator.shouldProcess(event.eventId)) return false;
    this.processedCount += 1;
    this.lastEvent = { eventId: event.eventId, type: event.type, serverTimestamp: event.serverTimestamp };
    realtimeStatusStore.markEvent(event.serverTimestamp);
    const payload: any = event.payload;
    const metadata = { serverTimestamp: event.serverTimestamp, revision: event.revision };
    switch (event.type) {
      case "message.created": if (event.roomId) { messageStore.upsertMessage(event.roomId, payload, metadata); conversationStore.touch(event.roomId, Number(payload?.timestamp || event.serverTimestamp)); } break;
      case "message.updated": case "message.reacted": case "message.pinned": if (event.roomId && payload?.message) messageStore.updateMessage(event.roomId, payload.message, metadata); break;
      case "message.deleted": if (event.roomId && payload?.messageId) messageStore.deleteMessage(event.roomId, payload.messageId, metadata); break;
      case "read.updated": if (event.roomId && payload?.user) { messageStore.markRead(event.roomId, payload.user, payload.messageId, metadata); conversationStore.markRead(event.roomId, payload.messageId, event.serverTimestamp); } break;
      case "conversation.added": case "conversation.updated": if (payload?.dm) conversationStore.upsert(payload.dm, event.serverTimestamp); break;
      case "friend.updated": if (payload?.state) friendStore.applyRealtime(payload.state, event.serverTimestamp); break;
      case "presence.updated": presenceStore.mergeRealtime(payload, event.serverTimestamp, event.revision); break;
      case "presence.count": presenceStore.setOnlineCount(payload?.count); break;
      case "typing.started": this.typingAdapters.forEach((adapter) => adapter.onStart(payload)); break;
      case "typing.stopped": this.typingAdapters.forEach((adapter) => adapter.onStop(payload)); break;
      case "call.offered": this.callAdapters.forEach((adapter) => adapter.onOffer(payload)); break;
      case "call.answered": this.callAdapters.forEach((adapter) => adapter.onAnswer(payload)); break;
      case "call.ice": this.callAdapters.forEach((adapter) => adapter.onIceCandidate(payload)); break;
      case "call.state": callStore.merge(payload, event.serverTimestamp, event.revision); this.callAdapters.forEach((adapter) => adapter.onState(payload)); break;
      case "call.declined": this.callAdapters.forEach((adapter) => adapter.onDecline(payload)); break;
      case "call.ended": if (event.roomId) callStore.remove(event.roomId); this.callAdapters.forEach((adapter) => adapter.onEnded(payload)); break;
      case "call.renegotiate": this.callAdapters.forEach((adapter) => adapter.onRenegotiate(payload)); break;
      case "call.renegotiate-answer": this.callAdapters.forEach((adapter) => adapter.onRenegotiateAnswer(payload)); break;
    }
    return true;
  }
  subscribeCalls(adapter: CallEventAdapter) { this.callAdapters.add(adapter); return () => this.callAdapters.delete(adapter); }
  subscribeTyping(adapter: TypingEventAdapter) { this.typingAdapters.add(adapter); return () => this.typingAdapters.delete(adapter); }
  resetTyping() { this.typingAdapters.forEach((adapter) => adapter.onReset()); }
  resetForIdentityChange() { this.deduplicator.clear(); this.resetTyping(); this.processedCount = 0; this.lastEvent = null; messageStore.reset(); conversationStore.reset(); friendStore.reset(); presenceStore.reset(); callStore.reset(); userStore.reset(); realtimeStatusStore.reset(); }
  getDiagnostics() { return { processedEventCount: this.processedCount, duplicateEventCount: this.deduplicator.getDuplicateCount(), lastEvent: this.lastEvent }; }
}
