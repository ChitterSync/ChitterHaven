import { createServer } from "node:http";
import next from "next";
import { initializeSocketServer } from "./src/pages/api/socketio";

const production = process.argv.includes("--production") || process.env.NODE_ENV === "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const portFlagIndex = process.argv.findIndex((argument) => argument === "-p" || argument === "--port");
const cliPort = portFlagIndex >= 0 ? process.argv[portFlagIndex + 1] : undefined;
const port = Number(cliPort || process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid port: ${cliPort || process.env.PORT || ""}`);
}

const app = next({ dev: !production, hostname, port });
const handle = app.getRequestHandler();

const start = async () => {
  await app.prepare();

  const server = createServer((request, response) => handle(request, response));
  initializeSocketServer(server);

  server.listen(port, hostname, () => {
    console.log(`ChitterHaven web server: http://${hostname}:${port}`);
    console.log(`Call signaling server: http://${hostname}:${port}/api/socketio`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

start().catch((error) => {
  console.error("Failed to start ChitterHaven:", error);
  process.exit(1);
});
