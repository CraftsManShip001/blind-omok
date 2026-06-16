// Shared board geometry + coordinate labels (client-safe).
import { BOARD_SIZE } from "./types";

export const PAD = 40; // gutter around the playing area (viewBox units)
export const PITCH = 36; // distance between adjacent intersections
export const VIEW = PAD * 2 + PITCH * (BOARD_SIZE - 1); // 584
export const STONE_R = 16;

/** viewBox X for grid column index. */
export const gx = (x: number) => PAD + x * PITCH;
/** viewBox Y for grid row index. */
export const gy = (y: number) => PAD + y * PITCH;

const COLS = "ABCDEFGHJKLMNOP"; // skips "I" to avoid 1/I confusion (15 letters A..P)

/** Human coordinate label, e.g. (7,7) -> "H8". */
export function coordLabel(x: number, y: number): string {
  return `${COLS[x] ?? "?"}${BOARD_SIZE - y}`;
}

export const STAR_POINTS: [number, number][] = [
  [3, 3],
  [3, 11],
  [11, 3],
  [11, 11],
  [7, 7],
];

/** Chebyshev (grid) distance — drives the reveal cascade stagger. */
export function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}
