// Authoritative in-memory game server: rooms, matchmaking, and the blind-masking
// serializer. Server-only — imports socket.io and node:crypto. Never import from a
// client component.

import { randomInt } from "node:crypto";
import type { Server, Socket } from "socket.io";
import {
  type ClientGameState,
  type ClientToServerEvents,
  type ChatMessage,
  type Coord,
  type Owner,
  type PlayerIndex,
  type PublicPlayer,
  type PublicSpectator,
  type Role,
  type RoomStatus,
  type ServerToClientEvents,
} from "../types";
import { checkWin, createBoard, inBounds, isBoardFull, isEmptyCell } from "../omok";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface RoomParticipant {
  clientId: string;
  /** Public, non-secret id safe to expose to other clients. */
  pid: string;
  nickname: string;
  role: Role;
  index: PlayerIndex | null;
  connected: boolean;
}

interface Move {
  x: number;
  y: number;
  player: PlayerIndex;
  n: number;
}

interface ServerRoom {
  code: string;
  isPublic: boolean;
  hostClientId: string;
  status: RoomStatus;
  board: Owner[][];
  moves: Move[];
  turn: PlayerIndex;
  startingPlayer: PlayerIndex;
  winner: PlayerIndex | null;
  winLine: Coord[] | null;
  endReason: ClientGameState["endReason"];
  participants: Map<string, RoomParticipant>;
  rematchVotes: Set<string>;
  rematchSerial: number;
  emptyAt: number | null;
  chat: ChatMessage[];
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
const CODE_LENGTH = 5;
const FORFEIT_GRACE_MS = 5_000; // short grace so a refresh/blip can reconnect; else remaining player wins
const EMPTY_ROOM_TTL_MS = 120_000;
const SWEEP_INTERVAL_MS = 30_000;
const MAX_NICK = 16;
const MAX_CHAT_LEN = 300;
const CHAT_HISTORY = 60;
const CHAT_MIN_INTERVAL_MS = 250;

function sanitizeNick(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim().slice(0, MAX_NICK) : "";
  return s.length > 0 ? s : "익명";
}

function genPid(): string {
  return Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

export class GameServer {
  private io: IO;
  private rooms = new Map<string, ServerRoom>();
  /** clientId -> room code */
  private clientRoom = new Map<string, string>();
  /** clientId -> current socket id */
  private clientSocket = new Map<string, string>();
  /** socket id -> clientId */
  private socketClient = new Map<string, string>();
  /** clientId -> nickname */
  private nickname = new Map<string, string>();
  /** matchmaking queue (clientIds, FIFO) */
  private queue: string[] = [];
  /** clientId -> pending forfeit timer */
  private forfeitTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private chatSeq = 1;
  /** clientId -> last chat timestamp (flood guard) */
  private lastChatAt = new Map<string, number>();

  constructor(io: IO) {
    this.io = io;
    io.on("connection", (socket) => this.onConnection(socket));
    setInterval(() => this.sweepEmptyRooms(), SWEEP_INTERVAL_MS).unref?.();
  }

  // ---- connection lifecycle ----

  private onConnection(socket: IOSocket) {
    socket.on("hello", (payload, ack) => {
      const clientId = typeof payload?.clientId === "string" ? payload.clientId : null;
      if (!clientId) {
        ack?.({ ok: false, error: "잘못된 요청입니다." });
        return;
      }
      socket.data.clientId = clientId;
      this.socketClient.set(socket.id, clientId);
      this.clientSocket.set(clientId, socket.id);
      this.nickname.set(clientId, sanitizeNick(payload.nickname));
      this.emitOnline();

      // Reconnect: if this client was already in a room, restore presence.
      const code = this.clientRoom.get(clientId);
      const room = code ? this.rooms.get(code) : undefined;
      if (room) {
        const p = room.participants.get(clientId);
        if (p) {
          p.connected = true;
          p.nickname = this.nickname.get(clientId)!;
          this.clearForfeit(clientId);
          room.emptyAt = null;
          socket.join(room.code);
          this.broadcast(room);
          this.sendChatHistory(clientId, room);
          ack?.({ ok: true, code: room.code });
          return;
        }
      }
      ack?.({ ok: true });
    });

    socket.on("setNickname", ({ nickname }) => {
      const clientId = socket.data.clientId;
      if (!clientId) return;
      const nick = sanitizeNick(nickname);
      this.nickname.set(clientId, nick);
      const room = this.roomOf(clientId);
      if (room) {
        const p = room.participants.get(clientId);
        if (p) p.nickname = nick;
        this.broadcast(room);
      }
    });

    socket.on("quickMatch", () => this.handleQuickMatch(socket));
    socket.on("cancelQuickMatch", () => this.handleCancelQuickMatch(socket));
    socket.on("createRoom", (ack) => this.handleCreateRoom(socket, ack));
    socket.on("joinRoom", ({ code }, ack) => this.handleJoinRoom(socket, code, ack));
    socket.on("leaveRoom", () => this.handleLeaveRoom(socket));
    socket.on("placeStone", (coord) => this.handlePlaceStone(socket, coord));
    socket.on("rematch", () => this.handleRematch(socket));
    socket.on("chat", ({ message }) => this.handleChat(socket, message));

    socket.on("disconnect", () => this.onDisconnect(socket));
  }

  private onDisconnect(socket: IOSocket) {
    const clientId = this.socketClient.get(socket.id);
    this.socketClient.delete(socket.id);
    if (!clientId) return;

    // Only clear the mapping if this socket is still the current one for the client.
    if (this.clientSocket.get(clientId) === socket.id) {
      this.clientSocket.delete(clientId);
    }
    this.removeFromQueue(clientId);

    this.emitOnline();

    const room = this.roomOf(clientId);
    if (!room) return;
    const p = room.participants.get(clientId);
    if (!p) return;
    p.connected = false;
    if (!this.anyoneConnected(room)) room.emptyAt = Date.now();
    this.broadcast(room);

    if (p.role === "player" && room.status === "playing") {
      this.emitTo(this.opponentOf(room, clientId), "toast", {
        kind: "warn",
        message: "상대 연결이 끊겼어요. 잠시 후 복귀하지 않으면 승리합니다.",
      });
      this.scheduleForfeit(clientId, room.code);
    }
  }

  private emitOnline() {
    this.io.emit("online", this.clientSocket.size);
  }

  // ---- matchmaking ----

  private handleQuickMatch(socket: IOSocket) {
    const clientId = socket.data.clientId;
    if (!clientId) return;
    // Leaving any current room before searching.
    this.detach(clientId);

    // Try to pair with the oldest live, distinct waiting client.
    while (this.queue.length > 0) {
      const opponent = this.queue.shift()!;
      if (opponent === clientId) continue;
      if (!this.clientSocket.has(opponent)) continue; // disconnected while queued
      const room = this.createRoomFor(opponent, false);
      this.seatPlayer(room, clientId, 1);
      this.startGame(room);
      // Notify both clients to navigate into the room.
      this.emitTo(opponent, "matched", { code: room.code });
      this.emitTo(clientId, "matched", { code: room.code });
      this.broadcast(room);
      return;
    }

    if (!this.queue.includes(clientId)) this.queue.push(clientId);
    this.emitTo(clientId, "queue", { status: "searching" });
  }

  private handleCancelQuickMatch(socket: IOSocket) {
    const clientId = socket.data.clientId;
    if (!clientId) return;
    this.removeFromQueue(clientId);
    this.emitTo(clientId, "queue", { status: "cancelled" });
  }

  // ---- room create / join / leave ----

  private handleCreateRoom(socket: IOSocket, ack: (r: { ok: boolean; code?: string; error?: string }) => void) {
    const clientId = socket.data.clientId;
    if (!clientId) {
      ack({ ok: false, error: "연결이 초기화되지 않았습니다." });
      return;
    }
    this.detach(clientId);
    const room = this.createRoomFor(clientId, true);
    socket.join(room.code);
    this.broadcast(room);
    ack({ ok: true, code: room.code });
  }

  private handleJoinRoom(
    socket: IOSocket,
    rawCode: string,
    ack: (r: { ok: boolean; code?: string; error?: string }) => void,
  ) {
    const clientId = socket.data.clientId;
    if (!clientId) {
      ack({ ok: false, error: "연결이 초기화되지 않았습니다." });
      return;
    }
    const code = typeof rawCode === "string" ? rawCode.trim().toUpperCase() : "";
    const room = this.rooms.get(code);
    if (!room) {
      ack({ ok: false, error: "방을 찾을 수 없습니다." });
      return;
    }

    // Already a participant (e.g. host, or reconnect): just restore + resync.
    const existing = room.participants.get(clientId);
    if (existing) {
      this.detachFromOtherRooms(clientId, code);
      existing.connected = true;
      existing.nickname = this.nickname.get(clientId) ?? existing.nickname;
      this.clientRoom.set(clientId, code);
      this.clearForfeit(clientId);
      room.emptyAt = null;
      socket.join(code);
      this.broadcast(room);
      this.sendChatHistory(clientId, room);
      ack({ ok: true, code });
      return;
    }

    // New entrant: leave any other room first.
    this.detach(clientId);

    const freeSlot = this.freePlayerSlot(room);
    if (freeSlot !== null && room.status !== "finished") {
      this.seatPlayer(room, clientId, freeSlot);
    } else {
      room.participants.set(clientId, {
        clientId,
        pid: genPid(),
        nickname: this.nickname.get(clientId) ?? "익명",
        role: "spectator",
        index: null,
        connected: true,
      });
    }
    this.clientRoom.set(clientId, code);
    room.emptyAt = null;
    socket.join(code);
    this.maybeStart(room);
    this.broadcast(room);
    this.sendChatHistory(clientId, room);
    ack({ ok: true, code });
  }

  private handleLeaveRoom(socket: IOSocket) {
    const clientId = socket.data.clientId;
    if (!clientId) return;
    socket.leave(this.clientRoom.get(clientId) ?? "");
    this.detach(clientId);
  }

  // ---- gameplay ----

  private handlePlaceStone(socket: IOSocket, coord: Coord) {
    const clientId = socket.data.clientId;
    if (!clientId) return;
    const room = this.roomOf(clientId);
    if (!room) return;
    if (room.status !== "playing") return;

    const p = room.participants.get(clientId);
    if (!p || p.role !== "player" || p.index === null) {
      this.emitTo(clientId, "toast", { kind: "warn", message: "관전자는 착수할 수 없습니다." });
      return;
    }
    if (room.turn !== p.index) {
      this.emitTo(clientId, "toast", { kind: "warn", message: "상대 차례입니다." });
      return;
    }
    const { x, y } = coord ?? {};
    if (!inBounds(x, y) || !isEmptyCell(room.board, x, y)) return;

    const n = room.moves.length + 1;
    room.board[y][x] = p.index;
    room.moves.push({ x, y, player: p.index, n });

    const line = checkWin(room.board, x, y, p.index);
    if (line) {
      room.status = "finished";
      room.winner = p.index;
      room.winLine = line;
      room.endReason = "win";
    } else if (isBoardFull(room.board)) {
      room.status = "finished";
      room.winner = null;
      room.winLine = null;
      room.endReason = "draw";
    } else {
      room.turn = (1 - p.index) as PlayerIndex;
    }
    this.broadcast(room);
  }

  private handleRematch(socket: IOSocket) {
    const clientId = socket.data.clientId;
    if (!clientId) return;
    const room = this.roomOf(clientId);
    if (!room || room.status !== "finished") return;
    const p = room.participants.get(clientId);
    if (!p || p.role !== "player") return;

    room.rematchVotes.add(clientId);

    const players = this.players(room);
    const bothPresent = players.length === 2 && players.every((pl) => pl.connected);
    const bothVoted = players.length === 2 && players.every((pl) => room.rematchVotes.has(pl.clientId));

    if (bothPresent && bothVoted) {
      room.startingPlayer = (1 - room.startingPlayer) as PlayerIndex; // alternate first move
      this.startGame(room);
    } else {
      this.emitTo(
        this.opponentOf(room, clientId),
        "toast",
        { kind: "info", message: `${p.nickname} 님이 재대국을 원합니다.` },
      );
    }
    this.broadcast(room);
  }

  private handleChat(socket: IOSocket, rawMessage: unknown) {
    const clientId = socket.data.clientId;
    if (!clientId) return;
    const room = this.roomOf(clientId);
    if (!room) return;
    const p = room.participants.get(clientId);
    if (!p) return;

    const text = typeof rawMessage === "string" ? rawMessage.trim().slice(0, MAX_CHAT_LEN) : "";
    if (!text) return;

    const now = Date.now();
    if (now - (this.lastChatAt.get(clientId) ?? 0) < CHAT_MIN_INTERVAL_MS) return;
    this.lastChatAt.set(clientId, now);

    const msg: ChatMessage = {
      id: this.chatSeq++,
      pid: p.pid,
      nickname: p.nickname,
      role: p.role,
      text,
      ts: now,
    };
    room.chat.push(msg);
    if (room.chat.length > CHAT_HISTORY) room.chat.shift();
    this.io.to(room.code).emit("chat", msg);
  }

  private sendChatHistory(clientId: string, room: ServerRoom) {
    this.emitTo(clientId, "chatHistory", room.chat);
  }

  // ---- room helpers ----

  private createRoomFor(hostClientId: string, isPublic: boolean): ServerRoom {
    const room: ServerRoom = {
      code: this.generateCode(),
      isPublic,
      hostClientId,
      status: "waiting",
      board: createBoard(),
      moves: [],
      turn: 0,
      startingPlayer: 0,
      winner: null,
      winLine: null,
      endReason: null,
      participants: new Map(),
      rematchVotes: new Set(),
      rematchSerial: 0,
      emptyAt: null,
      chat: [],
    };
    this.rooms.set(room.code, room);
    this.seatPlayer(room, hostClientId, 0);
    this.clientRoom.set(hostClientId, room.code);
    return room;
  }

  private seatPlayer(room: ServerRoom, clientId: string, index: PlayerIndex) {
    const existingPid = room.participants.get(clientId)?.pid;
    room.participants.set(clientId, {
      clientId,
      pid: existingPid ?? genPid(),
      nickname: this.nickname.get(clientId) ?? "익명",
      role: "player",
      index,
      connected: this.clientSocket.has(clientId),
    });
    this.clientRoom.set(clientId, room.code);
  }

  private maybeStart(room: ServerRoom) {
    if (room.status !== "waiting") return;
    if (this.players(room).length === 2) this.startGame(room);
  }

  private startGame(room: ServerRoom) {
    room.board = createBoard();
    room.moves = [];
    room.turn = room.startingPlayer;
    room.winner = null;
    room.winLine = null;
    room.endReason = null;
    room.rematchVotes.clear();
    room.rematchSerial += 1;
    room.status = "playing";
  }

  /** Remove a client from their current room entirely (explicit leave / re-queue). */
  private detach(clientId: string) {
    const code = this.clientRoom.get(clientId);
    if (!code) {
      this.removeFromQueue(clientId);
      return;
    }
    const room = this.rooms.get(code);
    this.clientRoom.delete(clientId);
    this.removeFromQueue(clientId);
    this.clearForfeit(clientId);
    if (!room) return;

    const p = room.participants.get(clientId);
    room.participants.delete(clientId);
    room.rematchVotes.delete(clientId);

    if (p?.role === "player" && room.status === "playing") {
      // Opponent wins by forfeit.
      const other = this.players(room).find((pl) => pl.clientId !== clientId);
      this.finishByForfeit(room, other ? other.index! : null);
    }
    if (!this.anyoneConnected(room)) room.emptyAt = Date.now();
    this.broadcast(room);
  }

  private detachFromOtherRooms(clientId: string, keepCode: string) {
    const code = this.clientRoom.get(clientId);
    if (code && code !== keepCode) this.detach(clientId);
  }

  private finishByForfeit(room: ServerRoom, winner: PlayerIndex | null) {
    room.status = "finished";
    room.winner = winner;
    room.winLine = null;
    room.endReason = "forfeit";
    if (winner !== null) {
      const w = this.players(room).find((pl) => pl.index === winner);
      if (w) {
        this.emitTo(w.clientId, "toast", {
          kind: "info",
          message: "상대가 나가 부전승으로 처리되었습니다.",
        });
      }
    }
  }

  private scheduleForfeit(clientId: string, code: string) {
    this.clearForfeit(clientId);
    const timer = setTimeout(() => {
      this.forfeitTimers.delete(clientId);
      const room = this.rooms.get(code);
      if (!room || room.status !== "playing") return;
      const p = room.participants.get(clientId);
      if (!p || p.connected) return; // reconnected in time
      const other = this.players(room).find((pl) => pl.clientId !== clientId);
      this.finishByForfeit(room, other ? other.index! : null);
      this.broadcast(room);
    }, FORFEIT_GRACE_MS);
    timer.unref?.();
    this.forfeitTimers.set(clientId, timer);
  }

  private clearForfeit(clientId: string) {
    const t = this.forfeitTimers.get(clientId);
    if (t) {
      clearTimeout(t);
      this.forfeitTimers.delete(clientId);
    }
  }

  private sweepEmptyRooms() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.emptyAt !== null && now - room.emptyAt > EMPTY_ROOM_TTL_MS) {
        for (const clientId of room.participants.keys()) {
          if (this.clientRoom.get(clientId) === code) this.clientRoom.delete(clientId);
        }
        this.rooms.delete(code);
      }
    }
  }

  // ---- small utilities ----

  private roomOf(clientId: string): ServerRoom | undefined {
    const code = this.clientRoom.get(clientId);
    return code ? this.rooms.get(code) : undefined;
  }

  private players(room: ServerRoom): RoomParticipant[] {
    return [...room.participants.values()]
      .filter((p) => p.role === "player" && p.index !== null)
      .sort((a, b) => (a.index! - b.index!));
  }

  private freePlayerSlot(room: ServerRoom): PlayerIndex | null {
    const taken = new Set(this.players(room).map((p) => p.index));
    if (!taken.has(0)) return 0;
    if (!taken.has(1)) return 1;
    return null;
  }

  private opponentOf(room: ServerRoom, clientId: string): string | null {
    const other = this.players(room).find((p) => p.clientId !== clientId);
    return other ? other.clientId : null;
  }

  private anyoneConnected(room: ServerRoom): boolean {
    return [...room.participants.values()].some((p) => p.connected);
  }

  private removeFromQueue(clientId: string) {
    const i = this.queue.indexOf(clientId);
    if (i !== -1) this.queue.splice(i, 1);
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = "";
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    // Extremely unlikely fallback.
    return CODE_ALPHABET[randomInt(CODE_ALPHABET.length)] + Date.now().toString(36).toUpperCase();
  }

  // ---- emit ----

  private emitTo<E extends keyof ServerToClientEvents>(
    clientId: string | null,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ) {
    if (!clientId) return;
    const sid = this.clientSocket.get(clientId);
    if (sid) this.io.to(sid).emit(event, ...args);
  }

  /** Emit a per-viewer masked snapshot to every connected participant. */
  private broadcast(room: ServerRoom) {
    for (const participant of room.participants.values()) {
      const sid = this.clientSocket.get(participant.clientId);
      if (!sid) continue;
      this.io.to(sid).emit("state", this.serializeFor(room, participant));
    }
  }

  private serializeFor(room: ServerRoom, viewer: RoomParticipant): ClientGameState {
    const canSeeOwners = viewer.role === "spectator" || room.status === "finished";

    const players: (PublicPlayer | null)[] = [null, null];
    const spectators: PublicSpectator[] = [];
    for (const p of room.participants.values()) {
      if (p.role === "player" && p.index !== null) {
        players[p.index] = { nickname: p.nickname, connected: p.connected, index: p.index };
      } else {
        spectators.push({ id: p.pid, nickname: p.nickname });
      }
    }

    // Map rematch votes (clientIds) to player indices — never expose clientIds.
    const rematchVotes: PlayerIndex[] = [];
    for (const voterId of room.rematchVotes) {
      const vp = room.participants.get(voterId);
      if (vp?.role === "player" && vp.index !== null) rematchVotes.push(vp.index);
    }

    const stones = room.moves.map((m) => ({
      x: m.x,
      y: m.y,
      n: m.n,
      owner: canSeeOwners ? m.player : null,
    }));

    const last = room.moves[room.moves.length - 1];

    return {
      code: room.code,
      status: room.status,
      turn: room.turn,
      players,
      spectators,
      stones,
      lastMove: last ? { x: last.x, y: last.y, n: last.n } : null,
      moveCount: room.moves.length,
      winner: room.winner,
      winLine: room.winLine,
      endReason: room.endReason,
      you: {
        pid: viewer.pid,
        role: viewer.role,
        index: viewer.index,
        canSeeOwners,
        // Players must NOT see the move list during play — the move numbers would
        // reveal ownership by parity, defeating the blind challenge.
        canSeeLedger: viewer.role === "spectator" || room.status === "finished",
      },
      isPublic: room.isPublic,
      rematchVotes,
      rematchSerial: room.rematchSerial,
    };
  }
}
