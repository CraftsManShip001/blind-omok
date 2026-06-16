// Quick correctness checks for the omok engine. Run: npx tsx scripts/test-omok.ts
import { createBoard, checkWin, isBoardFull, inBounds } from "../lib/omok";
import { BOARD_SIZE, type Owner, type PlayerIndex } from "../lib/types";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error("  ✗ FAIL:", msg);
  }
}

function place(board: Owner[][], coords: [number, number][], player: PlayerIndex) {
  for (const [x, y] of coords) board[y][x] = player;
}

// 1. Horizontal 5 wins
{
  const b = createBoard();
  place(b, [[3, 7], [4, 7], [5, 7], [6, 7]], 0);
  b[7][7] = 0;
  const line = checkWin(b, 7, 7, 0);
  assert(line !== null && line.length === 5, "horizontal 5 in a row wins");
}

// 2. Only 4 in a row does not win
{
  const b = createBoard();
  place(b, [[3, 7], [4, 7], [5, 7]], 0);
  b[7][6] = 0;
  const line = checkWin(b, 6, 7, 0);
  assert(line === null, "4 in a row is not a win");
}

// 3. Vertical 5 wins (placed in the middle of the run)
{
  const b = createBoard();
  place(b, [[5, 1], [5, 2], [5, 4], [5, 5]], 1);
  b[3][5] = 1;
  const line = checkWin(b, 5, 3, 1);
  assert(line !== null && line.length === 5, "vertical 5 with gap-fill wins");
}

// 4. Diagonal ↘ 5 wins
{
  const b = createBoard();
  place(b, [[2, 2], [3, 3], [4, 4], [5, 5]], 0);
  b[6][6] = 0;
  assert(checkWin(b, 6, 6, 0)?.length === 5, "diagonal ↘ 5 wins");
}

// 5. Diagonal ↗ 5 wins
{
  const b = createBoard();
  place(b, [[2, 6], [3, 5], [4, 4], [5, 3]], 1);
  b[2][6] = 1; // (x=6,y=2)
  assert(checkWin(b, 6, 2, 1)?.length === 5, "diagonal ↗ 5 wins");
}

// 6. Overline (6 in a row) also wins under free rule
{
  const b = createBoard();
  place(b, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]], 0);
  b[0][5] = 0;
  const line = checkWin(b, 5, 0, 0);
  assert(line !== null && line.length >= 5, "overline (6) wins under free rule");
}

// 7. Opponent stones don't count toward your run
{
  const b = createBoard();
  place(b, [[3, 7], [4, 7]], 0);
  b[7][5] = 1; // opponent breaks the line
  place(b, [[6, 7], [7, 7]], 0);
  b[7][8] = 0;
  assert(checkWin(b, 8, 7, 0) === null, "opponent stone breaks the run");
}

// 8. Win detection at the board edge
{
  const b = createBoard();
  const yy = BOARD_SIZE - 1;
  place(b, [[10, yy], [11, yy], [12, yy], [13, yy]], 1);
  b[yy][14] = 1;
  assert(checkWin(b, 14, yy, 1)?.length === 5, "win at bottom-right edge");
}

// 9. isBoardFull
{
  const b = createBoard();
  assert(!isBoardFull(b), "fresh board is not full");
  for (let y = 0; y < BOARD_SIZE; y++)
    for (let x = 0; x < BOARD_SIZE; x++) b[y][x] = ((x + y) % 2) as PlayerIndex;
  assert(isBoardFull(b), "fully occupied board is full");
}

// 10. inBounds sanity
assert(inBounds(0, 0) && inBounds(14, 14) && !inBounds(-1, 0) && !inBounds(15, 0), "inBounds");

console.log(`\nomok engine: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
