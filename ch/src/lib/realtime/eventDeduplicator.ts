export class EventDeduplicator {
  private entries = new Map<string, number>();
  private duplicateCount = 0;

  constructor(private readonly capacity = 3000, private readonly ttlMs = 10 * 60_000) {}

  shouldProcess(eventId: string, now = Date.now()) {
    this.prune(now);
    if (this.entries.has(eventId)) {
      this.duplicateCount += 1;
      if (process.env.NODE_ENV !== "production") console.debug("[realtime] duplicate rejected", { eventId });
      return false;
    }
    this.entries.set(eventId, now);
    while (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value!);
    return true;
  }

  clear() { this.entries.clear(); this.duplicateCount = 0; }
  getDuplicateCount() { return this.duplicateCount; }

  private prune(now: number) {
    for (const [eventId, timestamp] of this.entries) {
      if (now - timestamp <= this.ttlMs) break;
      this.entries.delete(eventId);
    }
  }
}
