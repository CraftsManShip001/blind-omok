// A simple opponent bot for manual/visual testing.
// Joins a room and, on its turn, plays the next free cell on row 12 (never
// blocking a row-0 win), so a human/driver as the other player can complete a line.
// Run: npx tsx scripts/bot.ts <ROOMCODE>
import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "../lib/types";

const URL = process.env.TEST_URL || "http://localhost:3000";
const code = (process.argv[2] || "").toUpperCase();
if (!code) {
  console.error("usage: tsx scripts/bot.ts <ROOMCODE>");
  process.exit(1);
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(URL, {
  path: "/socket.io",
  transports: ["websocket"],
});

socket.on("connect", () => {
  socket.emit(
    "hello",
    { clientId: `bot_${Math.random().toString(36).slice(2)}`, nickname: "오목봇" },
    () => socket.emit("joinRoom", { code }, (r) => console.log("join:", r)),
  );
});

const ROW = 12;
socket.on("state", (s) => {
  if (
    s.status === "playing" &&
    s.you.role === "player" &&
    s.you.index === s.turn
  ) {
    for (let x = 0; x < 15; x++) {
      if (!s.stones.some((st) => st.x === x && st.y === ROW)) {
        socket.emit("placeStone", { x, y: ROW });
        console.log(`bot played ${x},${ROW}`);
        break;
      }
    }
  }
  if (s.status === "finished") {
    console.log(`finished winner=${s.winner} reason=${s.endReason}`);
  }
});

console.log(`bot connecting to ${URL}, joining ${code}…`);
