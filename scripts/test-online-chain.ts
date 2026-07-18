/**
 * Online multi-jump chain regression: step-by-step captures must sync over
 * SocketIO, keep the turn open mid-chain, and reject the idle player.
 *
 * Scripted line (default rules):
 *   red (2,3)->(3,4); black (5,4)->(4,5);
 *   red jump (3,4)x(4,5)->(5,6)  [chain open]
 *   red jump (5,6)x(6,5)->(7,4)  [hazard, red dies, turn flips]
 *
 * Run with game server on :8000: npx tsx scripts/test-online-chain.ts
 */
import { Client } from '../node_modules/boardgame.io/dist/esm/client.js';
import { SocketIO } from '../node_modules/boardgame.io/dist/esm/multiplayer.js';
import { LobbyClient } from '../node_modules/boardgame.io/dist/esm/client.js';
import { CheckersGame } from '../src/game/game.ts';
import { getLegalMoves } from '../src/game/logic.ts';
import type { Move } from '../src/game/types.ts';

const SERVER = process.env.GAME_SERVER_URL ?? 'http://localhost:8000';
const GAME = 'extreme-checkers';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor<T>(
  fn: () => T | undefined | null | false,
  label: string,
  timeoutMs = 8000,
): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = fn();
    if (v) return v as T;
    await sleep(50);
  }
  throw new Error(`Timeout waiting for ${label}`);
}

type PlayMove = { playMove: (m: Move) => void };

function findMove(moves: Move[], to: { row: number; col: number }): Move {
  const m = moves.find((mv) => mv.to.row === to.row && mv.to.col === to.col);
  if (!m) throw new Error(`Move to ${to.row},${to.col} not legal: ${JSON.stringify(moves)}`);
  return m;
}

async function main() {
  const lobby = new LobbyClient({ server: SERVER });
  const { matchID } = await lobby.createMatch(GAME, { numPlayers: 2 });
  const p0 = await lobby.joinMatch(GAME, matchID, { playerID: '0', playerName: 'Red' });
  const p1 = await lobby.joinMatch(GAME, matchID, { playerID: '1', playerName: 'Black' });

  const make = (playerID: string, credentials: string) => {
    const c = Client({
      game: CheckersGame,
      multiplayer: SocketIO({ server: SERVER }),
      matchID,
      playerID,
      credentials,
    });
    c.start();
    return c;
  };
  const red = make(String(p0.playerID), p0.playerCredentials);
  const black = make(String(p1.playerID), p1.playerCredentials);

  await waitFor(() => red.getState()?.G?.board, 'red synced');
  await waitFor(() => black.getState()?.G?.board, 'black synced');

  const play = (client: typeof red, to: { row: number; col: number }, from: { row: number; col: number }) => {
    const st = client.getState()!;
    const color = st.ctx.currentPlayer === '0' ? 'red' : 'black';
    const legal = getLegalMoves(st.G.board, color, st.G.mustContinueFrom).filter(
      (m) => m.from.row === from.row && m.from.col === from.col,
    );
    (client.moves as PlayMove).playMove(findMove(legal, to));
  };

  // 1. red (2,3)->(3,4)
  play(red, { row: 3, col: 4 }, { row: 2, col: 3 });
  await waitFor(() => black.getState()?.ctx.currentPlayer === '1', 'turn to black');

  // 2. black (5,4)->(4,5)
  play(black, { row: 4, col: 5 }, { row: 5, col: 4 });
  await waitFor(() => red.getState()?.ctx.currentPlayer === '0', 'turn back to red');

  // 3. First hop of the forced chain
  play(red, { row: 5, col: 6 }, { row: 3, col: 4 });
  await waitFor(
    () =>
      red.getState()?.G.mustContinueFrom?.row === 5 &&
      red.getState()?.G.mustContinueFrom?.col === 6,
    'red sees open chain',
  );
  await waitFor(
    () =>
      black.getState()?.G.mustContinueFrom?.row === 5 &&
      black.getState()?.G.board[4][5] == null,
    'black client synced mid-chain state',
  );
  if (red.getState()!.ctx.currentPlayer !== '0') {
    throw new Error('Turn flipped mid-chain');
  }
  console.log('PASS: mid-chain state synced to both clients, turn stays red');

  // 4. Idle black tries to move mid-chain — must be rejected
  const bs = black.getState()!;
  const blackMoves = getLegalMoves(bs.G.board, 'black', null);
  if (blackMoves.length > 0) {
    (black.moves as PlayMove).playMove(blackMoves[0]);
    await sleep(500);
    const check = red.getState()!;
    if (check.G.board[blackMoves[0].from.row][blackMoves[0].from.col] == null) {
      throw new Error('Black moved during red chain!');
    }
    console.log('PASS: black rejected mid-chain');
  }

  // 5. Continuation onto hazard (7,4): red dies, black (6,5) captured, turn flips
  play(red, { row: 7, col: 4 }, { row: 5, col: 6 });
  await waitFor(
    () =>
      black.getState()?.ctx.currentPlayer === '1' &&
      black.getState()?.G.board[7][4] == null &&
      black.getState()?.G.board[6][5] == null &&
      black.getState()?.G.mustContinueFrom == null,
    'chain completed and turn flipped on both clients',
  );
  console.log('PASS: online multi-jump chain completes, hazard eliminates, turn flips');

  red.stop();
  black.stop();
  process.exit(0);
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
