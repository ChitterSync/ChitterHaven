import { Server, Socket } from "socket.io";
import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import fetch from "node-fetch";
import cookie from "cookie";
import { verifyJWT } from "./jwt";

export const config = {
  api: {
    bodyParser: false,
  },
};

let io: Server | null = null;
const userSockets: Record<string, Set<string>> = {};

const getOnlineCount = () => Object.keys(userSockets).length;

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
        const token = cookies.chitter_token;
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
        // If we have explicit targets, fan out to their user rooms so they can receive the call
        // even when not currently viewing the DM.
        if (targets && targets.length) {
          targets.forEach((t) => {
            io?.to(`user:${t}`).emit("call-offer", { room, offer, from });
          });
        } else {
          socket.to(room).emit("call-offer", { room, offer, from });
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
    });
  }
  res.end();
}
