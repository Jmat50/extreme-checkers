/**
 * Rules regression: jumps must offer every intermediate landing square
 * (step-by-step multi-jump via mustContinueFrom), optional captures, hazards.
 * Run: npx tsx scripts/test-jump-rules.ts
 */
import { Client } from '../node_modules/boardgame.io/dist/esm/client.js';
import { CheckersGame, applyAiMove } from '../src/game/game.ts';
import {
  getAllMoves,
  getMovesForPiece,
  getValidMovesForSelection,
  isHazardSquare,
} from '../src/game/logic.ts';
import type { Cell, CheckersState, Move } from '../src/game/types.ts';
import { BOARD_SIZE } from '../src/game/types.ts';

function emptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
}

function makeState(board: Cell[][]): CheckersState {
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

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  } else {
    console.log('PASS:', msg);
  }
}

function fmt(moves: Move[]): string {
  return moves
    .map(
      (m) =>
        `${m.from.row},${m.from.col}->${m.to.row},${m.to.col}` +
        (m.captures?.length ? ` x[${m.captures.map((c) => `${c.row},${c.col}`).join(' ')}]` : ''),
    )
    .join(' | ');
}

type PlayMove = { playMove: (m: Move) => void };

// --- Scenario 1: the reported position — adjacent jump must be offered ---
{
  const board = emptyBoard();
  board[4][5] = { color: 'red', king: true };
  board[4][3] = { color: 'black', king: true };
  board[5][2] = { color: 'black', king: true };
  board[5][4] = { color: 'black', king: true };
  board[6][5] = { color: 'black', king: true };

  const selMoves = getValidMovesForSelection(board, { row: 4, col: 5 }, 'red', null);
  console.log('S1 red (4,5) selection moves:', fmt(selMoves));

  assert(
    selMoves.some((m) => m.to.row === 6 && m.to.col === 3 && m.captures?.length === 1),
    'S1: red (4,5) can jump black (5,4) landing on the ADJACENT square (6,3)',
  );

  const client = Client({
    game: { ...CheckersGame, setup: () => makeState(board) },
  });
  client.start();
  const jump = selMoves.find((m) => m.to.row === 6 && m.to.col === 3)!;
  (client.moves as PlayMove).playMove(jump);

  let st = client.getState()!;
  assert(st.G.board[6][3]?.color === 'red', 'S1: red landed on (6,3)');
  assert(st.G.board[5][4] == null, 'S1: black (5,4) captured');
  assert(
    st.G.mustContinueFrom?.row === 6 && st.G.mustContinueFrom?.col === 3,
    'S1: chain continues from (6,3) — mustContinueFrom set',
  );
  assert(st.ctx.currentPlayer === '0', 'S1: still red mid-chain');

  // Continuation: (6,3) over (5,2) lands (4,1)
  const cont = st.G.validMoves.find((m) => m.to.row === 4 && m.to.col === 1)!;
  assert(Boolean(cont), 'S1: continuation jump to (4,1) offered');
  (client.moves as PlayMove).playMove(cont);

  st = client.getState()!;
  assert(st.G.board[4][1]?.color === 'red', 'S1: red completed chain on (4,1)');
  assert(st.G.board[5][2] == null, 'S1: black (5,2) captured');
  assert(st.G.mustContinueFrom == null, 'S1: chain complete');
  assert(st.ctx.currentPlayer === '1', 'S1: turn passes to black after chain');
  client.stop();
}

// --- Scenario 2: landing square occupied blocks that jump only ---
{
  const board = emptyBoard();
  board[4][5] = { color: 'red', king: true };
  board[5][4] = { color: 'black', king: true };
  board[6][3] = { color: 'black', king: true };

  const selMoves = getValidMovesForSelection(board, { row: 4, col: 5 }, 'red', null);
  assert(
    !selMoves.some((m) => m.to.row === 6 && m.to.col === 3),
    'S2: jump blocked when landing occupied',
  );
  assert(
    selMoves.every((m) => !m.captures?.length),
    'S2: no captures available -> slides allowed',
  );
}

// --- Scenario 3: applyAiMove auto-completes chains (AI path) ---
{
  const board = emptyBoard();
  board[2][1] = { color: 'red', king: true };
  board[3][2] = { color: 'black', king: true };
  board[5][4] = { color: 'black', king: true };

  const selMoves = getValidMovesForSelection(board, { row: 2, col: 1 }, 'red', null);
  console.log('S3 first-step moves:', fmt(selMoves));
  assert(
    selMoves.some((m) => m.to.row === 4 && m.to.col === 3 && m.captures?.length === 1),
    'S3: first hop to (4,3) offered',
  );

  const first = selMoves.find((m) => m.to.row === 4 && m.to.col === 3)!;
  const result = applyAiMove(makeState(board), first);
  assert(result.board[6][5]?.color === 'red', 'S3: AI chain auto-completed to (6,5)');
  assert(result.board[3][2] == null && result.board[5][4] == null, 'S3: both blacks captured');
  assert(result.mustContinueFrom == null, 'S3: no dangling mustContinueFrom');
}

// --- Scenario 4: captures optional — non-jumpers still get slides ---
{
  const board = emptyBoard();
  board[4][5] = { color: 'red', king: true };
  board[5][4] = { color: 'black', king: true };
  board[1][2] = { color: 'red', king: true };

  const farMoves = getValidMovesForSelection(board, { row: 1, col: 2 }, 'red', null);
  assert(farMoves.length > 0, 'S4: non-capturing red may still slide');
  assert(
    farMoves.every((m) => !m.captures?.length),
    'S4: far red only has slides (no adjacent enemy)',
  );

  const jumper = getValidMovesForSelection(board, { row: 4, col: 5 }, 'red', null);
  assert(
    jumper.some((m) => m.captures?.length),
    'S4: capturing red still offers jumps',
  );
  assert(
    jumper.some((m) => !m.captures?.length),
    'S4: capturing red may also slide (captures optional)',
  );

  const all = getAllMoves(board, 'red');
  assert(all.some((m) => m.captures?.length), 'S4: getAllMoves includes captures');
  assert(all.some((m) => !m.captures?.length), 'S4: getAllMoves includes slides');
}

// --- Scenario 5: jump landing on hazard allowed; chain ends there ---
{
  const board = emptyBoard();
  board[5][2] = { color: 'red', king: true };
  board[0][1] = { color: 'red', king: true }; // survivor so the game continues
  board[6][1] = { color: 'black', king: true };
  board[6][3] = { color: 'black', king: true }; // would be jumpable if red survived

  assert(isHazardSquare(7, 0), 'S5: (7,0) is a hazard by default');
  const selMoves = getValidMovesForSelection(board, { row: 5, col: 2 }, 'red', null);
  console.log('S5 moves:', fmt(selMoves));
  assert(
    selMoves.some((m) => m.to.row === 7 && m.to.col === 0 && m.captures?.length === 1),
    'S5: suicide jump onto hazard is offered',
  );

  const client = Client({
    game: { ...CheckersGame, setup: () => makeState(board) },
  });
  client.start();
  const jump = selMoves.find((m) => m.to.row === 7 && m.to.col === 0)!;
  (client.moves as PlayMove).playMove(jump);
  const st = client.getState()!;
  assert(st.G.board[7][0] == null, 'S5: red eliminated on hazard');
  assert(st.G.board[6][1] == null, 'S5: black still captured');
  assert(st.G.mustContinueFrom == null, 'S5: no continuation from a dead piece');
  assert(st.ctx.currentPlayer === '1', 'S5: turn passes after hazard death');
  client.stop();
}

// --- Scenario 6: malformed / illegal playMove is rejected, no crash ---
{
  const board = emptyBoard();
  board[4][5] = { color: 'red', king: true };
  board[5][4] = { color: 'black', king: true };

  const client = Client({
    game: { ...CheckersGame, setup: () => makeState(board) },
  });
  client.start();

  (client.moves as { playMove: (m?: unknown) => void }).playMove(undefined);
  (client.moves as { playMove: (m?: unknown) => void }).playMove({ from: { row: 4, col: 5 } });
  // Completely off-board / nonsense destination stays illegal
  (client.moves as PlayMove).playMove({ from: { row: 4, col: 5 }, to: { row: 0, col: 0 } });

  const st = client.getState()!;
  assert(st.G.board[4][5]?.color === 'red', 'S6: board unchanged after junk moves');
  assert(st.ctx.currentPlayer === '0', 'S6: turn unchanged after junk moves');
  client.stop();
}

// --- Scenario 7: mid-chain, moves from other pieces are rejected ---
{
  const board = emptyBoard();
  board[4][5] = { color: 'red', king: true };
  board[5][4] = { color: 'black', king: true };
  board[5][2] = { color: 'black', king: true };
  board[2][1] = { color: 'red', king: true };
  board[1][2] = { color: 'black', king: true }; // (2,1) could jump it if allowed

  const client = Client({
    game: { ...CheckersGame, setup: () => makeState(board) },
  });
  client.start();
  const first = getValidMovesForSelection(board, { row: 4, col: 5 }, 'red', null).find(
    (m) => m.to.row === 6 && m.to.col === 3,
  )!;
  (client.moves as PlayMove).playMove(first);

  let st = client.getState()!;
  assert(st.G.mustContinueFrom != null, 'S7: chain open after first hop');

  // Try to move the OTHER red piece mid-chain — must be rejected
  const otherJump = getMovesForPiece(st.G.board, { row: 2, col: 1 }).find(
    (m) => m.captures?.length,
  );
  if (otherJump) {
    (client.moves as PlayMove).playMove(otherJump);
  }
  st = client.getState()!;
  assert(st.G.board[2][1]?.color === 'red', 'S7: other red piece did not move mid-chain');
  assert(st.G.mustContinueFrom != null, 'S7: chain still open');

  // Complete the chain properly
  const cont = st.G.validMoves[0]!;
  (client.moves as PlayMove).playMove(cont);
  st = client.getState()!;
  assert(st.G.mustContinueFrom == null, 'S7: chain completed');
  assert(st.ctx.currentPlayer === '1', 'S7: turn passed to black');
  client.stop();
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll jump-rule scenarios passed');
