export type EventEnvelope = {
  eventId?: unknown;
  sequence?: unknown;
};

export type EventTrackingResult = {
  duplicate: boolean;
  gap: boolean;
  eventId: string | null;
  sequence: number | null;
};

export class RealtimeEventTracker {
  private eventIds = new Set<string>();
  private lastSequence = 0;

  constructor(private readonly capacity = 1000) {}

  observe(envelope: EventEnvelope): EventTrackingResult {
    const eventId = typeof envelope.eventId === "string" ? envelope.eventId : null;
    const sequence = typeof envelope.sequence === "number" && Number.isSafeInteger(envelope.sequence)
      ? envelope.sequence
      : null;
    if (eventId && this.eventIds.has(eventId)) {
      return { duplicate: true, gap: false, eventId, sequence };
    }
    if (eventId) {
      this.eventIds.add(eventId);
      while (this.eventIds.size > this.capacity) {
        const oldest = this.eventIds.values().next().value;
        if (oldest) this.eventIds.delete(oldest); else break;
      }
    }
    const gap = sequence !== null && this.lastSequence > 0 && sequence > this.lastSequence + 1;
    if (sequence !== null) this.lastSequence = Math.max(this.lastSequence, sequence);
    return { duplicate: false, gap, eventId, sequence };
  }

  getLastSequence() {
    return this.lastSequence;
  }
}
