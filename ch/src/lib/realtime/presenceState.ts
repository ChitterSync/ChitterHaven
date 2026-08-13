export type PresenceSession = { username: string; status: string; lastHeartbeat: number };

export const expirePresenceSessions = (
  sessions: Map<string, PresenceSession>,
  now: number,
  timeoutMs: number,
) => {
  const affectedUsers = new Set<string>();
  for (const [sessionId, session] of sessions) {
    if (now - session.lastHeartbeat <= timeoutMs) continue;
    sessions.delete(sessionId);
    affectedUsers.add(session.username);
  }
  return affectedUsers;
};

export const aggregatePresence = (sessions: Map<string, PresenceSession>, username: string) => {
  const active = Array.from(sessions.values()).filter((session) => session.username === username);
  if (!active.length) return "offline";
  if (active.some((session) => session.status === "online")) return "online";
  if (active.some((session) => session.status === "dnd")) return "dnd";
  if (active.some((session) => session.status === "away" || session.status === "idle")) return "away";
  return active[0].status || "unknown";
};
