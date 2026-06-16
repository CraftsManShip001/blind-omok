// Pure gomoku (omok) game logic — free rule (no forbidden moves; overlines win).
// No I/O, no server deps: trivially unit-testable.

import { BOARD_SIZE, WIN_COUNT, type Coord, type Owner, type PlayerIndex } from "./types";

const DIRECTIONS: Coord[] = [
  { x: 1, y: 0 }, // horizontal
  { x: 0, y: 1 }, // vertical
  { x: 1, y: 1 }, // diagonal ↘
  { x: 1, y: -1 }, // diagonal ↗
];

/** A fresh empty board, indexed `board[y][x]`. */
export function createBoard(): Owner[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array<Owner>(BOARD_SIZE).fill(null),
  );
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

export function isEmptyCell(board: Owner[][], x: number, y: number): boolean {
  return inBounds(x, y) && board[y][x] === null;
}

/**
 * After placing `player`'s stone at (x, y), return the winning line (>= 5 in a
 * row, free rule) if this move wins, otherwise `null`.
 */
export function checkWin(
  board: Owner[][],
  x: number,
  y: number,
  player: PlayerIndex,
): Coord[] | null {
  for (const { x: dx, y: dy } of DIRECTIONS) {
    const line: Coord[] = [{ x, y }];

    let cx = x + dx;
    let cy = y + dy;
    while (inBounds(cx, cy) && board[cy][cx] === player) {
      line.push({ x: cx, y: cy });
      cx += dx;
      cy += dy;
    }

    cx = x - dx;
    cy = y - dy;
    while (inBounds(cx, cy) && board[cy][cx] === player) {
      line.unshift({ x: cx, y: cy });
      cx -= dx;
      cy -= dy;
    }

    if (line.length >= WIN_COUNT) return line;
  }
  return null;
}

/** True when every cell is occupied (draw if no winner). */
export function isBoardFull(board: Owner[][]): boolean {
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === null) return false;
    }
  }
  return true;
}
