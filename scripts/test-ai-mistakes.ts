/**
 * Regression: low AI difficulty must occasionally pick suboptimal moves.
 * At difficulty 2, over many trials from a fixed position with a clear best
 * capture and weaker alternatives, at least one pick must differ from the
 * deterministic best (difficulty 10).
 *
 * Run: npx tsx scripts/test-ai-mistakes.ts
 */
import { pickAiMove } from '../src/game/ai.ts';
import { getLegalMoves, movesEqual } from '../src/game/logic.ts';
import type { Cell, CheckersState, Move } from '../src/game/types.ts';
import { BOARD_SIZE } from '../src/game/types.ts';

function emptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
}

/**
 * Red to move: strong capture red (3,2)→(5,4) jumping black (4,3),
 * plus weaker slides from red (2,1). Enough legal moves for blunders.
 */
function captureAndSlidesSetup(): CheckersState {
  const board = emptyBoard();
  board[3][2] = { color: 'red', king: true };
  board[2][1] = { color: 'red', king: true };
  board[4][3] = { color: 'black', king: true };
  board[6][1] = { color: 'black', king: true };
  return {
    board,
    selected: null,
    validMoves: [],
    mustContinueFrom: null,
    winner: null,
    lastMove: null,
    eliminationFlash: 0,
    lastEliminations: [],
  };
}

function moveKey(m: Move): string {
  return `${m.from.row},${m.from.col}->${m.to.row},${m.to.col}`;
}

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('PASS:', msg);
  }
}

const G = captureAndSlidesSetup();
const legal = getLegalMoves(G.board, 'red', null);
assert(legal.length >= 3, `setup has multiple legal moves (got ${legal.length})`);

const best = pickAiMove(G, 'red', 10);
assert(best != null, 'difficulty 10 returns a move');
assert(
  Boolean(best?.captures?.length),
  'difficulty 10 prefers a capture in this position',
);

const trials = 50;
const picks = new Set<string>();
let nonBest = 0;
for (let i = 0; i < trials; i++) {
  const move = pickAiMove(G, 'red', 2);
  assert(move != null, `difficulty 2 trial ${i} returns a move`);
  if (!move) continue;
  picks.add(moveKey(move));
  if (best && !movesEqual(move, best)) nonBest++;
}

assert(
  nonBest >= 1,
  `difficulty 2 blunders at least once in ${trials} trials (non-best=${nonBest})`,
);
assert(
  picks.size >= 2,
  `difficulty 2 uses more than one distinct move over ${trials} trials (got ${picks.size})`,
);

// High difficulty should stay deterministic on this shallow position.
const hardPicks = new Set<string>();
for (let i = 0; i < 20; i++) {
  const move = pickAiMove(G, 'red', 10);
  if (move) hardPicks.add(moveKey(move));
}
assert(
  hardPicks.size === 1,
  `difficulty 10 stays on one best move (got ${[...hardPicks].join(', ')})`,
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log(`\nAll checks passed (${nonBest}/${trials} non-best at difficulty 2)`);
