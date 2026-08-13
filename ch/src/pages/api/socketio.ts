import { Server, Socket } from "socket.io";
import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import crypto from "node:crypto";
import * as cookie from "cookie";
import { verifyJWT } from "@/server/api-lib/jwt";
import { AUTH_COOKIE_NAME } from "@/server/api-lib/authCookie";
import { readSessionFromRequest } from "@/lib/auth/session";
import { getDMForMember } from "@/pages/api/dms";
import { prisma } from "@/server/api-lib/prismaClient";
import { aggregatePresence, expirePresenceSessions, type PresenceSession } from "@/lib/realtime/presenceState";
import { redact } from "@/lib/security/redaction";

export const config = {
  api: {
    bodyParser: false,
  },
};

let io: Server | null = null;
const userSockets: Record<string, Set<string>> = {};
const presenceSessions = new Map<string, PresenceSession>();
const PRESENCE_TIMEOUT_MS = 75_000;
let presenceExpiryTimer: NodeJS.Timeout | null = null;
type CallParticipant = {
  user: string;
  status?: "ringing" | "connected";
  muted?: boolean;
  deafened?: boolean;
  videoEnabled?: boolean;
  screenSharing?: boolean;
};
type CallSnapshot = {
  room: string;
  state: "idle" | "calling" | "in-call";
  from: string;
  startedAt?: number;
  participants: CallParticipant[];
  revision: number;
  updatedAt: number;
  _event: RealtimeEventMetadata;
};
type RealtimeEventMetadata = {
  eventId: string;
  type: string;
  entityId?: string;
  conversationId?: string;
  actorId?: string;
  serverTimestamp: string;
  sequence: number;
};
const REALTIME_SEQUENCE_ID = "global";
const REALTIME_SEQUENCE_BLOCK = BigInt(1_000_000);
let realtimeSequence = 0;
let realtimeSequenceCeiling = 0;
const initializeRealtimeSequence = async () => {
  const reserved = await prisma.realtimeSequence.upsert({
    where: { id: REALTIME_SEQUENCE_ID },
    update: { value: { increment: REALTIME_SEQUENCE_BLOCK } },
    create: { id: REALTIME_SEQUENCE_ID, value: REALTIME_SEQUENCE_BLOCK },
  });
  const ceiling = Number(reserved.value);
  if (!Number.isSafeInteger(ceiling)) throw new Error("Realtime sequence exceeded JavaScript's safe integer range");
  realtimeSequenceCeiling = ceiling;
  realtimeSequence = ceiling - Number(REALTIME_SEQUENCE_BLOCK);
};
const eventMetadata = (type: string, options: Pick<RealtimeEventMetadata, "entityId" | "conversationId" | "actorId"> = {}): RealtimeEventMetadata => ({
  ...(() => {
    if (realtimeSequence >= realtimeSequenceCeiling) throw new Error("Realtime sequence block is not initialized or exhausted");
    const metadata = {
      eventId: crypto.randomUUID(),
      type,
      ...options,
      serverTimestamp: new Date().toISOString(),
      sequence: ++realtimeSequence,
    };
    void prisma.realtimeEvent.create({
      data: {
        sequence: BigInt(metadata.sequence),
        eventId: metadata.eventId,
        type: metadata.type,
        entityId: metadata.entityId,
        conversationId: metadata.conversationId,
        actorId: metadata.actorId,
      },
    }).catch((error) => console.error("[realtime] event journal write failed", redact(error)));
    return metadata;
  })(),
});
const callSnapshots = new Map<string, CallSnapshot>();
let callStateHydration: Promise<void> | null = null;
let callPersistTimer: NodeJS.Timeout | null = null;

const hydrateCallSnapshots = async () => {
  try {
    const stored = await prisma.callSession.findMany({ include: { members: true } });
    const now = Date.now();
    stored.forEach((record) => {
      const snapshot: CallSnapshot = {
        room: record.room,
        state: record.state as CallSnapshot["state"],
        from: record.initiator,
        startedAt: record.startedAt?.getTime(),
        participants: record.members.map((member) => ({
          user: member.userId,
          status: member.status === "connected" ? "connected" : "ringing",
          muted: member.muted,
          deafened: member.deafened,
          videoEnabled: member.videoEnabled,
          screenSharing: member.screenSharing,
        })),
        revision: record.revision,
        updatedAt: record.updatedAt.getTime(),
        _event: {
          eventId: record.eventId,
          type: `call.${record.state}`,
          entityId: record.room,
          conversationId: record.room,
          actorId: record.initiator,
          serverTimestamp: record.updatedAt.toISOString(),
          sequence: Number(record.eventSequence),
        },
      };
      if (!snapshot.room || !snapshot.updatedAt || snapshot.state === "idle") return;
      const maxAge = snapshot.state === "calling" ? 90_000 : 24 * 60 * 60 * 1000;
      if (now - snapshot.updatedAt <= maxAge) callSnapshots.set(snapshot.room, snapshot);
    });
  } catch (error) {
    console.error("[realtime] call state hydration failed", redact(error));
  }
};

const scheduleCallSnapshotPersistence = () => {
  if (callPersistTimer) clearTimeout(callPersistTimer);
  callPersistTimer = setTimeout(() => {
    callPersistTimer = null;
    const snapshots = Array.from(callSnapshots.values());
    void prisma.$transaction(async (transaction) => {
      const activeRooms = snapshots.map((snapshot) => snapshot.room);
      if (activeRooms.length) await transaction.callSession.deleteMany({ where: { room: { notIn: activeRooms } } });
      else await transaction.callSession.deleteMany();
      for (const snapshot of snapshots) {
        await transaction.callSession.upsert({
          where: { room: snapshot.room },
          update: {
            state: snapshot.state,
            initiator: snapshot.from,
            startedAt: snapshot.startedAt ? new Date(snapshot.startedAt) : null,
            revision: snapshot.revision,
            eventId: snapshot._event.eventId,
            eventSequence: BigInt(snapshot._event.sequence),
          },
          create: {
            room: snapshot.room,
            state: snapshot.state,
            initiator: snapshot.from,
            startedAt: snapshot.startedAt ? new Date(snapshot.startedAt) : null,
            revision: snapshot.revision,
            eventId: snapshot._event.eventId,
            eventSequence: BigInt(snapshot._event.sequence),
          },
        });
        await transaction.callParticipant.deleteMany({ where: { room: snapshot.room } });
        if (snapshot.participants.length) {
          await transaction.callParticipant.createMany({ data: snapshot.participants.map((participant) => ({
            room: snapshot.room,
            userId: participant.user,
            status: participant.status,
            muted: participant.muted === true,
            deafened: participant.deafened === true,
            videoEnabled: participant.videoEnabled === true,
            screenSharing: participant.screenSharing === true,
          })) });
        }
      }
    }).catch((error) => console.error("[realtime] call state persistence failed", redact(error)));
  }, 100);
};
type StoredCallOffer = {
  callId: string;
  offerId: string;
  offer: unknown;
  from: string;
  createdAt: number;
  _event: RealtimeEventMetadata;
};
const callOffers = new Map<string, StoredCallOffer>();
const callAnsweringSockets = new Map<string, string>();
const activeCallIds = new Map<string, string>();

const nextCallSnapshot = (
  room: string,
  from: string,
  state: CallSnapshot["state"],
  participants: CallParticipant[],
  startedAt?: number,
) => {
  const previous = callSnapshots.get(room);
  const snapshot: CallSnapshot = {
    room,
    state,
    from,
    startedAt: startedAt || previous?.startedAt,
    participants,
    revision: (previous?.revision || 0) + 1,
    updatedAt: Date.now(),
    _event: eventMetadata(`call.${state}`, { entityId: previous?._event?.entityId || room, conversationId: room, actorId: from }),
  };
  if (state === "idle" || participants.length === 0) callSnapshots.delete(room);
  else callSnapshots.set(room, snapshot);
  scheduleCallSnapshotPersistence();
  return snapshot;
};

export const publishCallState = (
  socketServer: Server,
  room: string,
  username: string,
  state: CallSnapshot["state"],
  participants: CallParticipant[] = [],
  startedAt?: number,
) => {
  const dm = getDMForMember(room, username);
  if (!dm) return null;
  const previous = callSnapshots.get(room);
  const ownUpdate = participants.find((entry) => entry?.user === username);
  let roster = previous?.participants || dm.users.map((user) => ({ user, status: "ringing" as const }));
  roster = roster.map((entry) => entry.user === username
    ? { ...entry, ...(ownUpdate || {}), user: username }
    : entry,
  );
  if (state === "idle") roster = roster.filter((entry) => entry.user !== username);
  const resolvedState = state === "idle" && roster.length ? (previous?.state || "calling") : state;
  const snapshot = nextCallSnapshot(room, username, resolvedState, roster, startedAt);
  socketServer.to(room).emit("call-state", snapshot);
  dm.users.forEach((user) => socketServer.to(`user:${user}`).emit("call-state", snapshot));
  return snapshot;
};

const getOnlineCount = () => Object.keys(userSockets).length;
const persistPresence = (socketId: string, username: string, status: string, connected: boolean, timestamp = Date.now()) => {
  void prisma.presenceDeviceSession.upsert({
    where: { socketId },
    update: {
      userId: username,
      status,
      connected,
      lastHeartbeat: new Date(timestamp),
      lastSeenAt: connected ? undefined : new Date(timestamp),
    },
    create: {
      socketId,
      userId: username,
      status,
      connected,
      lastHeartbeat: new Date(timestamp),
      lastSeenAt: connected ? null : new Date(timestamp),
    },
  }).catch((error) => console.error("[realtime] presence persistence failed", redact(error)));
};
const AUTH_SERVICE_BASE = (
  process.env.AUTH_BASE_URL ||
  process.env.AUTH_SERVICE_URL ||
  process.env.NEXT_PUBLIC_CS_AUTH_URL ||
  ""
).replace(/\/$/, "");

const resolveSocketUsername = async (cookieHeader: string): Promise<string | null> => {
  let centralAvailable = false;
  if (AUTH_SERVICE_BASE) {
    try {
      const response = await fetch(`${AUTH_SERVICE_BASE}/api/auth/me`, {
        headers: { cookie: cookieHeader },
        cache: "no-store",
      });
      if (response.ok) {
        centralAvailable = true;
        const data = await response.json();
        if (data?.authenticated && data.user?.username) return String(data.user.username);
      }
    } catch {
      // Use the cached ChitterSync session while the central service is unavailable.
    }
  }
  if (!centralAvailable) {
    const cachedSession = readSessionFromRequest({ headers: { cookie: cookieHeader } });
    if (cachedSession?.user?.username) return cachedSession.user.username;
  }
  try {
    const cookies = cookie.parse(cookieHeader);
    const token = cookies[AUTH_COOKIE_NAME];
    const payload: any = token ? verifyJWT(token) : null;
    return payload?.username ? String(payload.username) : null;
  } catch {
    return null;
  }
};

export const initializeSocketServer = (server: HTTPServer & { io?: Server }) => {
  if (!server.io) {
    io = new Server(server, {
      path: "/api/socketio",
      addTrailingSlash: false,
    });
    server.io = io;
    callStateHydration ||= initializeRealtimeSequence().then(hydrateCallSnapshots);
    presenceExpiryTimer ||= setInterval(async () => {
      await callStateHydration;
      const now = Date.now();
      const expiredUsers = expirePresenceSessions(presenceSessions, now, PRESENCE_TIMEOUT_MS);
      expiredUsers.forEach((expiredUser) => {
        const status = aggregatePresence(presenceSessions, expiredUser);
        io?.emit("presence", { user: expiredUser, status, lastSeen: new Date(now).toISOString(), _event: eventMetadata("presence.updated", { entityId: expiredUser, actorId: expiredUser }) });
        void prisma.presenceDeviceSession.updateMany({
          where: { userId: expiredUser, connected: true, lastHeartbeat: { lt: new Date(now - PRESENCE_TIMEOUT_MS) } },
          data: { connected: false, lastSeenAt: new Date(now) },
        }).catch((error) => console.error("[realtime] expired presence persistence failed", redact(error)));
      });
      for (const [room, snapshot] of callSnapshots) {
        const maxAge = snapshot.state === "calling" ? 90_000 : 24 * 60 * 60 * 1000;
        if (now - snapshot.updatedAt <= maxAge) continue;
        const ended = nextCallSnapshot(room, snapshot.from, "idle", [], snapshot.startedAt);
        io?.to(room).emit("call-state", ended);
      }
    }, 15_000);

    io.on("connection", async (socket: Socket) => {
      await callStateHydration;
      let username: string | null = null;
      const callEventTimes: number[] = [];
      const offerTimes: number[] = [];
      const realtimeEventTimes: number[] = [];
      const allowRealtimeEvent = () => {
        const now = Date.now();
        while (realtimeEventTimes.length && realtimeEventTimes[0] < now - 60_000) realtimeEventTimes.shift();
        if (realtimeEventTimes.length >= 360) return false;
        realtimeEventTimes.push(now);
        return true;
      };
      const authorizeRealtimeRoom = async (room: unknown) => {
        if (!username || typeof room !== "string" || !room || room.length > 180 || !allowRealtimeEvent()) return false;
        if (getDMForMember(room, username)) return true;
        const separator = room.lastIndexOf("__");
        if (separator <= 0 || separator >= room.length - 2) return false;
        const haven = room.slice(0, separator);
        const channel = room.slice(separator + 2);
        try {
          const setting = await prisma.serverSetting.findUnique({ where: { key: haven } });
          if (!setting) return false;
          const value = JSON.parse(setting.value || "{}");
          if (Array.isArray(value.channels) && value.channels.length > 0 && !value.channels.includes(channel)) return false;
          const permissions = value.permissions || {};
          const roles: Record<string, string[]> = permissions.roles || {};
          const memberRoles: string[] = permissions.members?.[username] || [];
          const everyone: string[] = permissions.defaults?.everyone || [];
          return everyone.includes("*") || everyone.includes("view_channels") || memberRoles.some((role) => (roles[role] || []).includes("*") || (roles[role] || []).includes("view_channels"));
        } catch {
          return false;
        }
      };
      const allowCallEvent = (kind: "offer" | "signal") => {
        const now = Date.now();
        while (callEventTimes.length && callEventTimes[0] < now - 60_000) callEventTimes.shift();
        while (offerTimes.length && offerTimes[0] < now - 60_000) offerTimes.shift();
        if (callEventTimes.length >= 240) return false;
        if (kind === "offer" && offerTimes.length >= 12) return false;
        callEventTimes.push(now);
        if (kind === "offer") offerTimes.push(now);
        return true;
      };
      const seenSignalEvents = new Map<string, number>();
      const signalSequences = new Map<string, number>();
      const authorizeCall = (data: any, kind: "offer" | "signal" = "signal") => {
        const now = Date.now();
        for (const [eventId, expiresAt] of seenSignalEvents) if (expiresAt <= now) seenSignalEvents.delete(eventId);
        const { room, callId, eventId, issuedAt, sequence } = data || {};
        if (!username || typeof room !== "string" || !room || typeof callId !== "string" || !callId ||
          typeof eventId !== "string" || !eventId || typeof issuedAt !== "number" || Math.abs(now - issuedAt) > 30_000 ||
          !Number.isSafeInteger(sequence) || sequence < 1 || seenSignalEvents.has(eventId) || !allowCallEvent(kind)) return null;
        const sequenceKey = `${callId}:${username}`;
        if (sequence <= (signalSequences.get(sequenceKey) || 0)) return null;
        if (kind !== "offer" && activeCallIds.get(room) !== callId) return null;
        const dm = getDMForMember(room, username);
        if (!dm) return null;
        seenSignalEvents.set(eventId, now + 60_000);
        signalSequences.set(sequenceKey, sequence);
        return dm;
      };
      username = await resolveSocketUsername(socket.request.headers.cookie || "");
      if (!username) {
        socket.disconnect(true);
        return;
      }
      if (username) {
        if (!userSockets[username]) userSockets[username] = new Set();
        userSockets[username].add(socket.id);
        socket.join(`user:${username}`);
        presenceSessions.set(socket.id, { username, status: "online", lastHeartbeat: Date.now() });
        persistPresence(socket.id, username, "online", true);
        for (const [room, pendingOffer] of callOffers) {
          if (pendingOffer.from === username) continue;
          if (!getDMForMember(room, username)) continue;
          socket.join(room);
          socket.emit("call-offer", { room, ...pendingOffer });
          const snapshot = callSnapshots.get(room);
          if (snapshot) socket.emit("call-state", snapshot);
        }
      }
      // Notify everyone of updated unique online member count
      const count = getOnlineCount();
      const countPayload = { count, _event: eventMetadata("presence.count") };
      io?.emit("online-count", countPayload);
      socket.emit("online-count", countPayload);
      socket.on("join-room", async (room: string) => {
        if (await authorizeRealtimeRoom(room)) {
          socket.join(room);
          const snapshot = callSnapshots.get(room);
          if (snapshot) socket.emit("call-state", snapshot);
        }
      });
      socket.on("leave-room", async (room: string) => {
        if (await authorizeRealtimeRoom(room)) socket.leave(room);
      });
      socket.on("message", async ({ room, msg }: { room: string; msg: any }) => {
        // Broadcast only; clients persist via /api/history and then emit this with the saved message
        if (!(await authorizeRealtimeRoom(room)) || !msg || msg.user !== username) return;
        socket.to(room).emit("message", { ...msg, room, _event: eventMetadata("message.created", { entityId: msg.id, conversationId: room, actorId: username! }) });
      });
      socket.on("edit", async ({ room, message }: { room: string; message: any }) => {
        if (!message || !(await authorizeRealtimeRoom(room))) return;
        socket.to(room).emit("edit", { room, message, _event: eventMetadata("message.updated", { entityId: message.id, conversationId: room, actorId: username! }) });
      });
      socket.on("delete", async ({ room, messageId }: { room: string; messageId: string }) => {
        if (!messageId || !(await authorizeRealtimeRoom(room))) return;
        socket.to(room).emit("delete", { room, messageId, _event: eventMetadata("message.deleted", { entityId: messageId, conversationId: room, actorId: username! }) });
      });
      socket.on("read", async ({ room, messageId }: { room: string; messageId?: string }) => {
        if (!(await authorizeRealtimeRoom(room))) return;
        const payload = { room, messageId, user: username, readAt: Date.now(), _event: eventMetadata("read.updated", { entityId: messageId, conversationId: room, actorId: username! }) };
        socket.to(room).emit("read", payload);
        io?.to(`user:${username}`).emit("read", payload);
      });
      socket.on("presence", ({ user, status }: { user: string; status: string }) => {
        if (!username || user !== username || !allowRealtimeEvent() || !["online", "idle", "away", "dnd", "offline"].includes(status)) return;
        presenceSessions.set(socket.id, { username, status, lastHeartbeat: Date.now() });
        persistPresence(socket.id, username, status, true);
        io?.emit("presence", { user: username, status, _event: eventMetadata("presence.updated", { entityId: username!, actorId: username! }) });
      });
      socket.on("presence-heartbeat", ({ status }: { status?: string } = {}) => {
        if (!username) return;
        const previous = presenceSessions.get(socket.id);
        const safeStatus = status && ["online", "idle", "away", "dnd"].includes(status) ? status : previous?.status || "online";
        presenceSessions.set(socket.id, { username, status: safeStatus, lastHeartbeat: Date.now() });
        persistPresence(socket.id, username, safeStatus, true);
      });
      socket.on("react", async ({ room, message }: { room: string; message?: any }) => {
        if (!message || !(await authorizeRealtimeRoom(room))) return;
        socket.to(room).emit("react", { room, message, _event: eventMetadata("message.reacted", { entityId: message.id, conversationId: room, actorId: username! }) });
      });
      socket.on("pin", async ({ room, message }: { room: string; message?: any }) => {
        if (!message || !(await authorizeRealtimeRoom(room))) return;
        socket.to(room).emit("pin", { room, message, _event: eventMetadata("message.pinned", { entityId: message.id, conversationId: room, actorId: username! }) });
      });
      const handleTypingStart = async (data: { room: string; user: string }) => {
        if (typeof data === "object" && data.room && data.user === username && await authorizeRealtimeRoom(data.room)) {
          socket.to(data.room).emit("typing-start", { room: data.room, user: username, _event: eventMetadata("typing.started", { entityId: username!, conversationId: data.room, actorId: username! }) });
        }
      };
      socket.on("typing", handleTypingStart);
      socket.on("typing-start", handleTypingStart);
      socket.on("typing-stop", async (data: { room: string; user: string }) => {
        if (typeof data === "object" && data.room && data.user === username && await authorizeRealtimeRoom(data.room)) {
          socket.to(data.room).emit("typing-stop", { room: data.room, user: username, _event: eventMetadata("typing.stopped", { entityId: username!, conversationId: data.room, actorId: username! }) });
        }
      });
      socket.on("disconnect", () => {
        const disconnectedUser = username;
        const disconnectedPresence = presenceSessions.get(socket.id);
        presenceSessions.delete(socket.id);
        if (disconnectedUser) persistPresence(socket.id, disconnectedUser, disconnectedPresence?.status || "offline", false);
        if (username && userSockets[username]) {
          userSockets[username].delete(socket.id);
          if (userSockets[username].size === 0) {
            delete userSockets[username];
          }
        }
        io?.emit("online-count", { count: getOnlineCount(), _event: eventMetadata("presence.count") });
        if (disconnectedUser) {
          setTimeout(() => {
            if (userSockets[disconnectedUser]?.size) return;
            for (const [room, offer] of callOffers) {
              if (offer.from === disconnectedUser) callOffers.delete(room);
            }
            for (const [room, snapshot] of callSnapshots) {
              if (!snapshot.participants.some((entry) => entry.user === disconnectedUser)) continue;
              const participants = snapshot.participants.filter((entry) => entry.user !== disconnectedUser);
              const next = nextCallSnapshot(
                room,
                disconnectedUser,
                participants.length ? snapshot.state : "idle",
                participants,
                snapshot.startedAt,
              );
              io?.to(room).emit("call-state", next);
              const dm = getDMForMember(room, disconnectedUser);
              dm?.users.forEach((user) => io?.to(`user:${user}`).emit("call-state", next));
            }
          }, 10_000);
        }
      });
      // --- Voice call signaling events ---
      socket.on("call-offer", (data: any, acknowledge?: (result: any) => void) => {
        const { room, offer, targets, callId } = data || {};
        if (!room || !offer) return acknowledge?.({ ok: false, error: "Invalid call offer" });
        const dm = authorizeCall(data, "offer");
        if (!dm) return acknowledge?.({ ok: false, error: "Not authorized for this call" });
        socket.join(room);
        const existingOffer = callOffers.get(room);
        if (existingOffer && existingOffer.from !== username) {
          socket.emit("call-offer", { room, ...existingOffer });
          acknowledge?.({ ok: true, callId: existingOffer.callId, joinedExisting: true });
          return;
        }
        const storedOffer: StoredCallOffer = {
          callId: existingOffer?.callId || callId,
          offerId: existingOffer?.offerId || crypto.randomUUID(),
          offer,
          from: username!,
          createdAt: existingOffer?.createdAt || Date.now(),
          _event: existingOffer?._event || eventMetadata("call.offered", { entityId: callId, conversationId: room, actorId: username! }),
        };
        callOffers.set(room, storedOffer);
        activeCallIds.set(room, storedOffer.callId);
        callAnsweringSockets.delete(room);
        const previous = callSnapshots.get(room);
        const participants = dm.users.map((user) => ({
          ...(previous?.participants.find((entry) => entry.user === user) || { user }),
          status: user === username ? "connected" as const : "ringing" as const,
        }));
        const snapshot = nextCallSnapshot(room, username!, "calling", participants);
        io?.to(room).emit("call-state", snapshot);
        // Deliver once through each recipient's personal room, even if they are not viewing the DM.
        const allowedTargets = dm.users.filter((user) => user !== username && (!targets || targets.includes(user)));
        if (allowedTargets.length) {
          allowedTargets.forEach((t) => {
            io?.in(`user:${t}`).socketsJoin(room);
            io?.to(`user:${t}`).emit("call-offer", { room, ...storedOffer });
          });
        }
        const onlineTargets = allowedTargets.filter((target) => Boolean(userSockets[target]?.size));
        acknowledge?.({ ok: true, callId: storedOffer.callId, onlineTargets: onlineTargets.length });
      });
      socket.on("call-answer", (data: any, acknowledge?: (result: any) => void) => {
        const { room, answer } = data || {};
        if (!room || !answer) return acknowledge?.({ ok: false, error: "Invalid call answer" });
        if (!authorizeCall(data)) return acknowledge?.({ ok: false, error: "Not authorized for this call" });
        const answeringSocket = callAnsweringSockets.get(room);
        if (answeringSocket && answeringSocket !== socket.id) return acknowledge?.({ ok: false, error: "This call was answered on another device" });
        callAnsweringSockets.set(room, socket.id);
        socket.join(room);
        socket.to(room).emit("call-answer", { room, answer, from: username, callId: data.callId, _event: eventMetadata("call.answered", { entityId: data.callId, conversationId: room, actorId: username! }) });
        acknowledge?.({ ok: true });
        const previous = callSnapshots.get(room);
        const participants = (previous?.participants || []).map((entry) =>
          entry.user === username ? { ...entry, status: "connected" as const } : entry,
        );
        const snapshot = nextCallSnapshot(room, username!, "in-call", participants, previous?.startedAt || Date.now());
        callOffers.delete(room);
        io?.to(room).emit("call-state", snapshot);
      });
      socket.on("ice-candidate", (data: any) => {
        const { room, candidate } = data || {};
        if (!room || !candidate) return;
        if (!authorizeCall(data)) return;
        socket.join(room);
        socket.to(room).emit("ice-candidate", { room, candidate, from: username, callId: data.callId, _event: eventMetadata("call.ice", { entityId: data.callId, conversationId: room, actorId: username! }) });
      });
      socket.on("call-renegotiate", (data: any) => {
        const { room, offer } = data || {};
        if (!room || !offer) return;
        if (!authorizeCall(data)) return;
        socket.join(room);
        socket.to(room).emit("call-renegotiate", { room, offer, from: username, callId: data.callId, _event: eventMetadata("call.renegotiate", { entityId: data.callId, conversationId: room, actorId: username! }) });
      });
      socket.on("call-renegotiate-answer", (data: any) => {
        const { room, answer } = data || {};
        if (!room || !answer) return;
        if (!authorizeCall(data)) return;
        socket.join(room);
        socket.to(room).emit("call-renegotiate-answer", { room, answer, from: username, callId: data.callId, _event: eventMetadata("call.renegotiate-answer", { entityId: data.callId, conversationId: room, actorId: username! }) });
      });
      // Broadcast generic call state so all clients (and other user sockets) stay in sync.
      socket.on("call-state", (data: any) => {
        const { room, state, startedAt, participants } = data || {};
        if (!room || !state) return;
        const dm = authorizeCall(data);
        if (!dm || !["idle", "calling", "in-call"].includes(state)) return;
        const previous = callSnapshots.get(room);
        const ownUpdate = Array.isArray(participants)
          ? participants.find((entry) => entry?.user === username)
          : null;
        let safeParticipants = previous?.participants || dm.users.map((user) => ({ user, status: "ringing" as const }));
        safeParticipants = safeParticipants.map((entry) => entry.user === username
          ? {
              ...entry,
              ...(ownUpdate || {}),
              user: username!,
              status: ownUpdate?.status === "connected" ? "connected" : entry.status,
            }
          : entry,
        );
        if (state === "idle") safeParticipants = safeParticipants.filter((entry) => entry.user !== username);
        const resolvedState = state === "idle" && safeParticipants.length ? (previous?.state || "calling") : state as CallSnapshot["state"];
        const payload = nextCallSnapshot(room, username!, resolvedState, safeParticipants, startedAt);
        io?.to(room).emit("call-state", payload);
        const participantUsers = dm.users;
        participantUsers.forEach((user) => {
          io?.to(`user:${user}`).emit("call-state", payload);
        });
      });
      socket.on("call-decline", (data: any) => {
        const { room } = data || {};
        if (!room) return;
        if (!authorizeCall(data)) return;
        const previous = callSnapshots.get(room);
        if (previous) {
          const participants = previous.participants.filter((entry) => entry.user !== username);
          io?.to(room).emit("call-state", nextCallSnapshot(room, username!, participants.length ? previous.state : "idle", participants));
        }
        socket.to(room).emit("call-decline", { room, from: username, callId: data.callId, _event: eventMetadata("call.declined", { entityId: data.callId, conversationId: room, actorId: username! }) });
      });
      socket.on("call-ended", (data: any) => {
        const { room, startedAt, endedAt } = data || {};
        if (!room) return;
        const dm = authorizeCall(data);
        if (!dm) return;
        const snapshot = nextCallSnapshot(room, username!, "idle", [], startedAt);
        callOffers.delete(room);
        callAnsweringSockets.delete(room);
        activeCallIds.delete(room);
        const payload = { room, from: username, startedAt, endedAt, revision: snapshot.revision, _event: eventMetadata("call.ended", { entityId: data.callId, conversationId: room, actorId: username! }) };
        io?.to(room).emit("call-state", snapshot);
        socket.to(room).emit("call-ended", payload);
        const participantUsers = dm.users;
        participantUsers.forEach((user) => {
          io?.to(`user:${user}`).emit("call-ended", payload);
        });
      });
      socket.on("dm-added", ({ dm }: { dm: { id: string; users: string[]; title?: string; group?: boolean; owner?: string; moderators?: string[]; avatarUrl?: string } }) => {
        if (!username || !dm || !Array.isArray(dm?.users) || !dm.users.includes(username)) return;
        dm.users.forEach((user) => {
          io?.to(`user:${user}`).emit("dm-added", { dm, _event: eventMetadata("conversation.added", { entityId: dm.id, conversationId: dm.id, actorId: username! }) });
        });
      });
      socket.on("dm-updated", ({ dm }: { dm: { id: string; users: string[]; title?: string; group?: boolean; owner?: string; moderators?: string[]; avatarUrl?: string } }) => {
        if (!dm || !Array.isArray(dm.users)) return;
        dm.users.forEach((user) => {
          io?.to(`user:${user}`).emit("dm-updated", { dm, _event: eventMetadata("conversation.updated", { entityId: dm.id, conversationId: dm.id, actorId: username! }) });
        });
      });
    });
  }
  return server.io;
};

// Retain the API route as a compatibility initializer for serverless-style hosts.
export default function handler(req: NextApiRequest, res: any) {
  initializeSocketServer(res.socket.server as HTTPServer & { io?: Server });
  res.end();
}
