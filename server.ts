// Custom Next.js server with an attached Socket.IO game server.
// Run with `npm run dev` (tsx watch) or `npm start` (production).
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { GameServer } from "./lib/server/gameServer";
import type { ClientToServerEvents, ServerToClientEvents } from "./lib/types";

const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOST || "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

// Create the HTTP server up front so both Next (HMR upgrade) and Socket.IO can
// attach to the very same instance.
const httpServer = createServer();

const app = next({ dev, hostname, port, httpServer });
const handle = app.getRequestHandler();

httpServer.on("request", (req, res) => {
  handle(req, res);
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  path: "/socket.io",
  // Same-origin in production; permissive in dev for convenience.
  cors: dev ? { origin: "*" } : undefined,
  serveClient: false,
});

new GameServer(io);

app
  .prepare()
  .then(() => {
    httpServer.listen(port, () => {
      console.log(
        `▸ 블라인드 오목 ready on http://localhost:${port}  (${dev ? "development" : "production"})`,
      );
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
