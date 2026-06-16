// Shared types between the Socket.IO server and the React client.
// NOTE: keep this file free of any server-only (node/socket.io) imports so it
// can be safely imported from client components.

export const BOARD_SIZE = 15;
export const WIN_COUNT = 5; // free rule: 5-or-more in a row wins (overlines count)

export type PlayerIndex = 0 | 1;
/** Owner of a cell. `null` means empty OR masked (blind) depending on context. */
export type Owner = PlayerIndex | null;

export type RoomStatus = "waiting" | "playing" | "finished";
export type Role = "player" | "spectator";

export interface Coord {
  x: number;
  y: number;
}

/** A single placed stone as sent to a client. `owner` is `null` when masked. */
export interface SerializedStone {
  x: number;
  y: number;
  n: number; // 1-based move order
  owner: Owner; // null while blind; real index for spectators / after game end
}

export interface PublicPlayer {
  nickname: string;
  connected: boolean;
  index: PlayerIndex;
}

export interface PublicSpectator {
  /** Public, non-secret id (NOT the clientId) — safe for UI keys. */
  id: string;
  nickname: string;
}

export interface ViewerInfo {
  /** Viewer's own public id (non-secret) — used to mark own chat messages. */
  pid: string;
  role: Role;
  index: PlayerIndex | null; // null for spectators
  /** Whether this viewer is allowed to know stone owners (spectator, or game finished). */
  canSeeOwners: boolean;
  /** Whether this viewer may see the move history (기보) — spectators, or after game end. */
  canSeeLedger: boolean;
}

export interface ChatMessage {
  id: number;
  pid: string; // sender's public id
  nickname: string;
  role: Role;
  text: string;
  ts: number;
}

/** Full per-viewer snapshot of a room. Owners in `stones` are masked unless `you.canSeeOwners`. */
export interface ClientGameState {
  code: string;
  status: RoomStatus;
  turn: PlayerIndex;
  players: (PublicPlayer | null)[]; // length 2
  spectators: PublicSpectator[];
  stones: SerializedStone[];
  lastMove: (Coord & { n: number }) | null;
  moveCount: number;
  winner: PlayerIndex | null;
  winLine: Coord[] | null;
  /** Why the game ended — distinguishes a real 5-in-a-row from a forfeit/draw. */
  endReason: "win" | "draw" | "forfeit" | null;
  you: ViewerInfo;
  isPublic: boolean;
  /** Player indices that have requested a rematch (never exposes clientIds). */
  rematchVotes: PlayerIndex[];
  /** Increments each time a new game starts in this room (drives reset animation). */
  rematchSerial: number;
}

// ---- Socket.IO event contracts ----

export interface HelloPayload {
  clientId: string;
  nickname: string;
}

export interface AckResult {
  ok: boolean;
  code?: string;
  error?: string;
}

export interface ClientToServerEvents {
  hello: (p: HelloPayload, ack?: (r: AckResult) => void) => void;
  setNickname: (p: { nickname: string }) => void;
  quickMatch: () => void;
  cancelQuickMatch: () => void;
  createRoom: (ack: (r: AckResult) => void) => void;
  joinRoom: (p: { code: string }, ack: (r: AckResult) => void) => void;
  leaveRoom: () => void;
  placeStone: (p: Coord) => void;
  rematch: () => void;
  chat: (p: { message: string }) => void;
}

export interface ServerToClientEvents {
  state: (s: ClientGameState) => void;
  matched: (p: { code: string }) => void;
  queue: (p: { status: "searching" | "cancelled" }) => void;
  roomError: (p: { message: string }) => void;
  toast: (p: { kind: "info" | "success" | "warn" | "error"; message: string }) => void;
  online: (count: number) => void;
  chat: (m: ChatMessage) => void;
  chatHistory: (msgs: ChatMessage[]) => void;
}
