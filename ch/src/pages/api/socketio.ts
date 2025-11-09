import { Server, Socket } from "socket.io";
import type { NextApiRequest } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: false,
  },
};

let io: Server | null = null;
let onlineCount = 0;

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.io) {
    io = new Server(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
    });
    res.socket.server.io = io;

    io.on("connection", (socket: Socket) => {
      onlineCount += 1;
      // Notify everyone of updated count and send to the connecting client
      io?.emit("online-count", { count: onlineCount });
      socket.emit("online-count", { count: onlineCount });
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
        onlineCount = Math.max(0, onlineCount - 1);
        io?.emit("online-count", { count: onlineCount });
      });
      // --- Voice call signaling events ---
      socket.on("call-offer", ({ room, offer, from }: { room: string; offer: any; from: string }) => {
        socket.to(room).emit("call-offer", { offer, from });
      });
      socket.on("call-answer", ({ room, answer, from }: { room: string; answer: any; from: string }) => {
        socket.to(room).emit("call-answer", { answer, from });
      });
      socket.on("ice-candidate", ({ room, candidate, from }: { room: string; candidate: any; from: string }) => {
        socket.to(room).emit("ice-candidate", { candidate, from });
      });
    });
  }
  res.end();
}
