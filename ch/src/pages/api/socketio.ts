import { Server } from "socket.io";
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

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.io) {
    io = new Server(res.socket.server, {
      path: "/api/socketio",
      addTrailingSlash: false,
    });
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      socket.on("join-room", (room) => {
        socket.join(room);
      });
      socket.on("message", async ({ room, msg }) => {
        // Save message to history
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/history`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room, msg })
          });
        } catch (e) {
          // ignore error for now
        }
        socket.to(room).emit("message", msg);
      });
      socket.on("typing", (data) => {
        if (typeof data === "object" && data.room && data.user) {
          socket.to(data.room).emit("typing", data);
        }
      });
    });
  }
  res.end();
}
