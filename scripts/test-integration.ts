// End-to-end protocol test against a running dev server (npm run dev).
// Verifies the blind-masking invariant, the end-game reveal, rematch, and forfeit.
// Run: npx tsx scripts/test-integration.ts
import { io, type Socket } from "socket.io-client";
import type {
  ChatMessage,
  ClientGameState,
  ClientToServerEvents,
  ServerToClientEvents,
} from "../lib/types";

const URL = process.env.TEST_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;
function check(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log("  ✓", msg);
  } else {
    failed++;
    console.error("  ✗ FAIL:", msg);
  }
}

type S = Socket<ServerToClientEvents, ClientToServerEvents>;
interface Client {
  socket: S;
  last: ClientGameState | null;
  waiters: { pred: (s: ClientGameState) => boolean; resolve: () => void }[];
  chats: ChatMessage[];
}

function uuid() {
  return `c_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function connect(nickname: string): Promise<Client> {
  return new Promise((resolve, reject) => {
    const socket: S = io(URL, { path: "/socket.io", transports: ["websocket"] });
    const client: Client = { socket, last: null, waiters: [], chats: [] };
    socket.on("state", (s) => {
      client.last = s;
      client.waiters = client.waiters.filter((w) => {
        if (w.pred(s)) {
          w.resolve();
          return false;
        }
        return true;
      });
    });
    socket.on("chat", (m) => client.chats.push(m));
    socket.on("chatHistory", (msgs) => (client.chats = [...msgs]));
    socket.on("connect", () => {
      socket.emit("hello", { clientId: uuid(), nickname }, (res) => {
        if (res.ok) resolve(client);
        else reject(new Error("hello failed"));
      });
    });
    socket.on("connect_error", reject);
    setTimeout(() => reject(new Error(`connect timeout for ${nickname}`)), 5000);
  });
}

function waitFor(
  c: Client,
  pred: (s: ClientGameState) => boolean,
  label = "state",
): Promise<void> {
  if (c.last && pred(c.last)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    c.waiters.push({ pred, resolve });
    setTimeout(() => reject(new Error(`waitFor timeout: ${label}`)), 5000);
  });
}

const createRoom = (c: Client): Promise<string> =>
  new Promise((resolve, reject) =>
    c.socket.emit("createRoom", (r) =>
      r.ok && r.code ? resolve(r.code) : reject(new Error(r.error)),
    ),
  );

const joinRoom = (c: Client, code: string): Promise<void> =>
  new Promise((resolve, reject) =>
    c.socket.emit("joinRoom", { code }, (r) =>
      r.ok ? resolve() : reject(new Error(r.error)),
    ),
  );

function waitUntil(cond: () => boolean, label: string, timeout = 4000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (cond()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error(`waitUntil timeout: ${label}`));
      setTimeout(tick, 20);
    };
    tick();
  });
}

async function place(c: Client, x: number, y: number) {
  const before = c.last?.moveCount ?? 0;
  c.socket.emit("placeStone", { x, y });
  await waitFor(c, (s) => s.moveCount === before + 1, `move ${x},${y}`);
}

async function main() {
  const a = await connect("앨리스");
  const b = await connect("밥");
  const s = await connect("관전자");

  const code = await createRoom(a);
  check(typeof code === "string" && code.length >= 4, `room created: ${code}`);

  await joinRoom(b, code);
  await joinRoom(s, code);

  // game should be playing with 2 players + 1 spectator
  await waitFor(a, (st) => st.status === "playing", "A playing");
  await waitFor(s, (st) => st.spectators.length === 1, "spectator listed");
  check(a.last!.status === "playing", "game started when 2nd player joined");
  check(a.last!.you.index === 0, "A is player 0");
  check(b.last!.you.index === 1, "B is player 1");
  check(s.last!.you.role === "spectator", "S is spectator");
  check(a.last!.turn === 0, "player 0 starts");

  // ---- ledger visibility (blind: players must NOT see the move list) ----
  check(a.last!.you.canSeeLedger === false, "player cannot see 기보 during play");
  check(s.last!.you.canSeeLedger === true, "spectator can see 기보");

  // ---- chat reaches every participant ----
  a.socket.emit("chat", { message: "gg hf" });
  await waitUntil(
    () =>
      a.chats.some((m) => m.text === "gg hf") &&
      b.chats.some((m) => m.text === "gg hf") &&
      s.chats.some((m) => m.text === "gg hf"),
    "chat delivered to all",
  );
  const cm = s.chats.find((m) => m.text === "gg hf")!;
  check(cm.nickname === "앨리스", "chat carries sender nickname");
  check(cm.role === "player", "chat carries sender role");
  check(cm.pid === a.last!.you.pid, "chat pid matches sender's own pid");

  // play A to a horizontal win on row 0, B harmlessly on row 5
  const aMoves: [number, number][] = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ];
  const bMoves: [number, number][] = [
    [0, 5],
    [1, 5],
    [2, 5],
    [3, 5],
  ];

  for (let i = 0; i < aMoves.length; i++) {
    await waitFor(a, (st) => st.turn === 0 && st.status === "playing", "A turn");
    await place(a, aMoves[i][0], aMoves[i][1]);

    // ---- blind-masking invariant (only while the game is still in progress) ----
    check(
      a.last!.status === "finished" ||
        a.last!.stones.every((st) => st.owner === null),
      `move ${i + 1}: player A sees NO owners while playing (blind)`,
    );
    check(
      b.last!.stones.every((st) => st.owner === null) ||
        b.last!.status === "finished",
      `move ${i + 1}: player B sees NO owners while playing`,
    );
    if (s.last!.stones.length > 0 && s.last!.status === "playing") {
      check(
        s.last!.stones.some((st) => st.owner !== null),
        `move ${i + 1}: spectator DOES see owners`,
      );
    }

    if (a.last!.status === "finished") break;
    if (i < bMoves.length) {
      await waitFor(b, (st) => st.turn === 1 && st.status === "playing", "B turn");
      await place(b, bMoves[i][0], bMoves[i][1]);
    }
  }

  // ---- reveal at game end ----
  await waitFor(a, (st) => st.status === "finished", "A finished");
  await waitFor(b, (st) => st.status === "finished", "B finished");
  check(a.last!.winner === 0, "winner is player 0 (A)");
  check(a.last!.endReason === "win", "endReason is win");
  check((a.last!.winLine?.length ?? 0) >= 5, "winLine has >= 5 stones");
  check(
    a.last!.stones.every((st) => st.owner !== null),
    "at game end player A now sees all owners (reveal)",
  );
  check(
    b.last!.stones.every((st) => st.owner !== null),
    "at game end player B now sees all owners (reveal)",
  );
  check(
    a.last!.stones.filter((st) => st.owner === 0).length === 5,
    "exactly 5 stones owned by player 0",
  );
  check(a.last!.you.canSeeLedger === true, "player can see 기보 after game end");

  // ---- rematch alternates the starting player ----
  const serialBefore = a.last!.rematchSerial;
  a.socket.emit("rematch");
  check(
    (await waitFor(a, (st) => st.rematchVotes.includes(0)).then(() => true)) ===
      true,
    "A's rematch vote is reflected as player index 0",
  );
  b.socket.emit("rematch");
  await waitFor(
    a,
    (st) => st.status === "playing" && st.rematchSerial > serialBefore,
    "rematch new game",
  );
  check(a.last!.moveCount === 0, "rematch resets the board");
  check(a.last!.turn === 1, "rematch alternates starting player to 1");
  check(
    a.last!.stones.length === 0 && a.last!.winner === null,
    "rematch clears stones and winner",
  );

  // ---- explicit leave forfeits immediately ----
  b.socket.emit("leaveRoom");
  await waitFor(a, (st) => st.status === "finished", "forfeit finish");
  check(a.last!.endReason === "forfeit", "leaving mid-game forfeits");
  check(a.last!.winner === 0, "remaining player A wins by forfeit");

  a.socket.close();
  b.socket.close();
  s.socket.close();

  // ---- disconnect (e.g. closed tab) forfeits after the short grace ----
  const x = await connect("엑스");
  const y = await connect("와이");
  const c2 = await createRoom(x);
  await joinRoom(y, c2);
  await waitFor(x, (st) => st.status === "playing", "fresh game playing");
  y.socket.disconnect(); // simulate a closed tab
  await waitUntil(
    () => x.last?.status === "finished",
    "disconnect forfeit (within grace)",
    9000,
  );
  check(x.last!.endReason === "forfeit", "disconnect forfeits the leaver");
  check(x.last!.winner === 0, "remaining player wins on opponent disconnect");
  x.socket.close();
  y.socket.close();

  console.log(`\nintegration: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nintegration test crashed:", err.message);
  process.exit(1);
});
