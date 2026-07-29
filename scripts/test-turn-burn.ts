/**
 * Regression: selectSquare no-ops / reselects must not end the turn
 * before a real board move (previously maxMoves: 2 burned the turn).
 */
import { Client } from '../node_modules/boardgame.io/dist/esm/client.js';
import { CheckersGame } from '../src/game/game.ts';
import type { CheckersState, Cell, PieceColor } from '../src/game/types.ts';
import { BOARD_SIZE } from '../src/game/types.ts';
import { getAllMoves, initialState } from '../src/game/logic.ts';
import { pickAiMove, applyAiMove } from '../src/game/game.ts';

function emptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
}

/** Capture available: red (3,2) can jump black (4,3)→(5,4); red (2,1) may also slide. */
function captureAvailableSetup(): CheckersState {
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

function makeClient(setup: () => CheckersState = captureAvailableSetup) {
  return Client({
    game: { ...CheckersGame, setup },
  });
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

type Moves = { selectSquare: (row: number, col: number) => void };

// --- A: selecting another piece / capturer must not burn the turn ---
{
  const client = makeClient();
  client.start();
  const moves = client.moves as Moves;

  assert(client.getState()!.ctx.currentPlayer === '0', 'A: starts as red');

  moves.selectSquare(2, 1);
  let state = client.getState()!;
  assert(
    state.G.selected?.row === 2 && state.G.selected?.col === 1,
    'A: non-capturer may select (captures optional)',
  );
  assert(
    state.ctx.currentPlayer === '0',
    `A: still red after select (got ${state.ctx.currentPlayer})`,
  );

  moves.selectSquare(3, 2);
  state = client.getState()!;
  assert(
    state.ctx.currentPlayer === '0',
    `A: still red after selecting capturer (got ${state.ctx.currentPlayer})`,
  );
  assert(
    state.G.selected?.row === 3 && state.G.selected?.col === 2,
    `A: capturer selected (got ${JSON.stringify(state.G.selected)})`,
  );
  assert(state.G.validMoves.length > 0, 'A: capturer has valid moves');

  moves.selectSquare(5, 4);
  state = client.getState()!;
  assert(state.G.board[5][4]?.color === 'red', 'A: capture completed to 5,4');
  assert(state.G.board[4][3] == null, 'A: jumped piece removed');
  assert(
    state.ctx.currentPlayer === '1',
    `A: turn passed to black after real move (got ${state.ctx.currentPlayer})`,
  );
  assert(state.G.selected == null, 'A: selection cleared after turn end');
  assert(state.G.validMoves.length === 0, 'A: validMoves cleared after turn end');
}

// --- B: deselect empty square must not end turn ---
{
  const client = makeClient();
  client.start();
  const moves = client.moves as Moves;

  moves.selectSquare(3, 2);
  moves.selectSquare(0, 1);
  let state = client.getState()!;
  assert(
    state.ctx.currentPlayer === '0',
    `B: deselect should not end turn (got ${state.ctx.currentPlayer})`,
  );
  assert(state.G.selected == null, 'B: selection cleared');

  moves.selectSquare(3, 2);
  moves.selectSquare(5, 4);
  state = client.getState()!;
  assert(state.G.board[5][4]?.color === 'red', 'B: can still complete capture after deselect');
  assert(state.ctx.currentPlayer === '1', 'B: turn ends only after real move');
}

// --- C: reselect same piece keeps turn ---
{
  const client = makeClient();
  client.start();
  const moves = client.moves as Moves;

  moves.selectSquare(3, 2);
  moves.selectSquare(3, 2);
  let state = client.getState()!;
  assert(
    state.ctx.currentPlayer === '0',
    `C: reselect same piece keeps turn (got ${state.ctx.currentPlayer})`,
  );
  moves.selectSquare(5, 4);
  state = client.getState()!;
  assert(state.G.board[5][4]?.color === 'red', 'C: move still works after reselect');
}

// --- D: many alternating turns from initial position stay playable ---
{
  const client = makeClient(() => initialState());
  client.start();
  const moves = client.moves as Moves;

  let stuck = false;
  for (let turn = 0; turn < 40; turn++) {
    const state = client.getState()!;
    if (state.ctx.gameover) break;

    const color = (state.ctx.currentPlayer === '0' ? 'red' : 'black') as PieceColor;
    const legal = getAllMoves(state.G.board, color);
    if (legal.length === 0) {
      stuck = true;
      console.error(`D: no legal moves on turn ${turn} for ${color} but game not over`);
      break;
    }

    const move = legal[turn % legal.length];
    moves.selectSquare(move.from.row, move.from.col);
    const afterSelect = client.getState()!;
    if (afterSelect.ctx.currentPlayer !== state.ctx.currentPlayer) {
      stuck = true;
      console.error(`D: turn flipped on select alone at turn ${turn}`);
      break;
    }
    moves.selectSquare(move.to.row, move.to.col);
  }

  assert(!stuck, 'D: 40 turns without select-only turn burn or softlock');
  const final = client.getState()!;
  assert(
    final.ctx.gameover != null ||
      getAllMoves(final.G.board, final.ctx.currentPlayer === '0' ? 'red' : 'black')
        .length > 0,
    'D: game either over or current side still has moves',
  );
}

// --- E: AI playMove path still advances turns ---
{
  let G = initialState();
  for (let i = 0; i < 10; i++) {
    const color: PieceColor = i % 2 === 0 ? 'red' : 'black';
    const move = pickAiMove(G, color);
    if (!move) break;
    G = applyAiMove(G, move);
  }
  const reds = G.board.flat().filter((c) => c?.color === 'red').length;
  const blacks = G.board.flat().filter((c) => c?.color === 'black').length;
  assert(reds > 0 && blacks > 0, `E: AI path keeps both sides after moves (r=${reds} b=${blacks})`);
}

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll turn-burn scenarios passed');
