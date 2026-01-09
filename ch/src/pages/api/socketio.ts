import { Server, Socket } from "socket.io";
import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import fetch from "node-fetch";
import cookie from "cookie";
import { verifyJWT } from "./jwt";
import { AUTH_COOKIE_NAME } from "./_lib/authCookie";

export const config = {
  api: {
    bodyParser: false,
  },
};

let io: Server | null = null;
const userSockets: Record<string, Set<string>> = {};

const getOnlineCount = () => Object.keys(userSockets).length;

// --- handler (the main event).
export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.io) {
    io = new Server(res.socket.server as unknown as HTTPServer, {
      path: "/api/socketio",
      addTrailingSlash: false,
    });
    res.socket.server.io = io;

    io.on("connection", (socket: Socket) => {
      let username: string | null = null;
      try {
        const cookies = cookie.parse(socket.request.headers.cookie || "");
        const token = cookies[AUTH_COOKIE_NAME];
        const payload: any = token ? verifyJWT(token) : null;
        if (payload?.username) username = String(payload.username);
      } catch {
        username = null;
      }
      if (username) {
        if (!userSockets[username]) userSockets[username] = new Set();
        userSockets[username].add(socket.id);
        socket.join(`user:${username}`);
      }
      // Notify everyone of updated unique online member count
      const count = getOnlineCount();
      io?.emit("online-count", { count });
      socket.emit("online-count", { count });
      socket.on("join-room", (room: string) => {
        socket.join(room);
      });
      socket.on("message", ({ room, msg }: { room: string; msg: any }) => {
        // Broadcast only; clients persist via /api/history and then emit this with the saved message
        socket.to(room).emit("message", msg);
      });
      socket.on("edit", ({ room, message }: { room: string; message: any }) => {
        if (!message) return;
        socket.to(room).emit("edit", { message });
      });
      socket.on("delete", ({ room, messageId }: { room: string; messageId: string }) => {
        if (!messageId) return;
        socket.to(room).emit("delete", { messageId });
      });
      socket.on("presence", ({ user, status }: { user: string; status: string }) => {
        if (!user) return;
        io?.emit("presence", { user, status });
      });
      socket.on("react", ({ room, message }: { room: string; message?: any }) => {
        if (!message) return;
        socket.to(room).emit("react", { message });
      });
      socket.on("pin", ({ room, message }: { room: string; message?: any }) => {
        if (!message) return;
        socket.to(room).emit("pin", { message });
      });
      socket.on("typing", (data: { room: string; user: string }) => {
        if (typeof data === "object" && data.room && data.user) {
          socket.to(data.room).emit("typing", data);
        }
      });
      socket.on("disconnect", () => {
        if (username && userSockets[username]) {
          userSockets[username].delete(socket.id);
          if (userSockets[username].size === 0) {
            delete userSockets[username];
          }
        }
        io?.emit("online-count", { count: getOnlineCount() });
      });
      // --- Voice call signaling events ---
      socket.on("call-offer", ({ room, offer, from, targets }: { room: string; offer: any; from: string; targets?: string[] }) => {
        if (!room || !offer) return;
        // Fan out to the room (DM) so active listeners get the offer.
        socket.to(room).emit("call-offer", { room, offer, from });
        // Also push directly to per-user rooms if provided, so users not currently in the DM still receive it.
        if (targets && targets.length) {
          targets.forEach((t) => {
            io?.to(`user:${t}`).emit("call-offer", { room, offer, from });
          });
        }
      });
      socket.on("call-answer", ({ room, answer, from }: { room: string; answer: any; from: string }) => {
        if (!room || !answer) return;
        socket.to(room).emit("call-answer", { room, answer, from });
      });
      socket.on("ice-candidate", ({ room, candidate, from }: { room: string; candidate: any; from: string }) => {
        if (!room || !candidate) return;
        socket.to(room).emit("ice-candidate", { room, candidate, from });
      });
      // Broadcast generic call state so all clients (and other user sockets) stay in sync.
      socket.on("call-state", ({ room, state, from, startedAt, participants }: { room: string; state: string; from: string; startedAt?: number; participants?: any[] }) => {
        if (!room || !state) return;
        const payload = { room, state, from, startedAt, participants };
        socket.to(room).emit("call-state", payload);
        const participantUsers = Array.isArray(participants)
          ? Array.from(new Set(participants.map((entry) => (entry && typeof entry.user === "string" ? entry.user : null)).filter(Boolean) as string[]))
          : [];
        participantUsers.forEach((user) => {
          io?.to(`user:${user}`).emit("call-state", payload);
        });
      });
      socket.on("call-decline", ({ room, from }: { room: string; from: string }) => {
        if (!room || !from) return;
        socket.to(room).emit("call-decline", { room, from });
      });
      socket.on("call-ended", ({ room, from, startedAt, endedAt, participants }: { room: string; from: string; startedAt?: number; endedAt?: number; participants?: any[] }) => {
        if (!room) return;
        const payload = { room, from, startedAt, endedAt };
        socket.to(room).emit("call-ended", payload);
        const participantUsers = Array.isArray(participants)
          ? Array.from(new Set(participants.map((entry) => (entry && typeof entry.user === "string" ? entry.user : null)).filter(Boolean) as string[]))
          : [];
        participantUsers.forEach((user) => {
          io?.to(`user:${user}`).emit("call-ended", payload);
        });
      });
      socket.on("dm-added", ({ dm }: { dm: { id: string; users: string[]; title?: string; group?: boolean; owner?: string; moderators?: string[]; avatarUrl?: string } }) => {
        if (!username || !dm || !Array.isArray(dm?.users) || !dm.users.includes(username)) return;
        dm.users.forEach((user) => {
          io?.to(`user:${user}`).emit("dm-added", { dm });
        });
      });
      socket.on("dm-updated", ({ dm }: { dm: { id: string; users: string[]; title?: string; group?: boolean; owner?: string; moderators?: string[]; avatarUrl?: string } }) => {
        if (!dm || !Array.isArray(dm.users)) return;
        dm.users.forEach((user) => {
          io?.to(`user:${user}`).emit("dm-updated", { dm });
        });
      });
    });
  }
  res.end();
}
