/**
 * Online multiplayer move regression using Lobby API + SocketIO clients.
 * Uses atomic playMove (the UI path after the online fix).
 * Run with game server on :8000: npx tsx scripts/test-online-moves.ts
 */
import { Client } from '../node_modules/boardgame.io/dist/esm/client.js';
import { SocketIO } from '../node_modules/boardgame.io/dist/esm/multiplayer.js';
import { LobbyClient } from '../node_modules/boardgame.io/dist/esm/client.js';
import { CheckersGame } from '../src/game/game.ts';
import { getAllMoves, isHazardSquare } from '../src/game/logic.ts';
import type { Move, PieceColor } from '../src/game/types.ts';

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

function pickSafeMove(moves: Move[]): Move | null {
  return (
    moves.find((m) => !isHazardSquare(m.to.row, m.to.col)) ?? moves[0] ?? null
  );
}

async function main() {
  const lobby = new LobbyClient({ server: SERVER });

  const health = await fetch(`${SERVER}/api/health`).then((r) => r.json());
  if (!health?.ok) throw new Error(`Server unhealthy: ${JSON.stringify(health)}`);

  const { matchID } = await lobby.createMatch(GAME, { numPlayers: 2 });
  const p0 = await lobby.joinMatch(GAME, matchID, {
    playerID: '0',
    playerName: 'RedHost',
  });
  const p1 = await lobby.joinMatch(GAME, matchID, {
    playerID: '1',
    playerName: 'BlackGuest',
  });

  console.log('joined', {
    matchID,
    p0: p0.playerID,
    p1: p1.playerID,
  });

  const makePlayer = (playerID: string, credentials: string) => {
    const client = Client({
      game: CheckersGame,
      multiplayer: SocketIO({ server: SERVER }),
      matchID,
      playerID,
      credentials,
    });
    client.start();
    return client;
  };

  const c0 = makePlayer(String(p0.playerID), p0.playerCredentials);
  const c1 = makePlayer(String(p1.playerID), p1.playerCredentials);

  await waitFor(() => c0.getState()?.isConnected, 'p0 connected');
  await waitFor(() => c1.getState()?.isConnected, 'p1 connected');
  await waitFor(() => c0.getState()?.G?.board, 'p0 synced G');
  await waitFor(() => c1.getState()?.G?.board, 'p1 synced G');

  const s0 = c0.getState()!;
  if (!s0.isActive) throw new Error('Player 0 should be active on turn 0');

  // --- Atomic playMove path (what the UI now uses) ---
  for (let turn = 0; turn < 6; turn++) {
    const active = turn % 2 === 0 ? c0 : c1;
    const idle = turn % 2 === 0 ? c1 : c0;
    const expectedPlayer = String(turn % 2);
    const color = (expectedPlayer === '0' ? 'red' : 'black') as PieceColor;

    await waitFor(
      () => active.getState()?.ctx.currentPlayer === expectedPlayer && active.getState()?.isActive,
      `player ${expectedPlayer} active on turn ${turn}`,
    );

    const state = active.getState()!;
    const legal = getAllMoves(state.G.board, color);
    const move = pickSafeMove(legal);
    if (!move) throw new Error(`No legal moves for ${color} on turn ${turn}`);

    (active.moves as { playMove: (m: Move) => void }).playMove(move);

    const nextPlayer = String((turn + 1) % 2);
    await waitFor(
      () =>
        active.getState()?.ctx.currentPlayer === nextPlayer &&
        idle.getState()?.ctx.currentPlayer === nextPlayer,
      `both clients see turn ${nextPlayer} after move ${turn}`,
    );

    const after = active.getState()!;
    if (after.G.board[move.from.row][move.from.col] != null) {
      throw new Error(`Source not emptied after turn ${turn}`);
    }
    console.log(`PASS turn ${turn}: ${color} ${move.from.row},${move.from.col} -> ${move.to.row},${move.to.col}`);
  }

  // Rapid-fire: no select step; immediate playMove must not get stuck
  await waitFor(() => c0.getState()?.isActive, 'p0 active again');
  const rapidLegal = getAllMoves(c0.getState()!.G.board, 'red');
  const rapidMove = pickSafeMove(rapidLegal);
  if (!rapidMove) throw new Error('No rapid move');
  (c0.moves as { playMove: (m: Move) => void }).playMove(rapidMove);
  await waitFor(() => c0.getState()?.ctx.currentPlayer === '1', 'rapid move flips turn');
  console.log('PASS: rapid atomic playMove');

  console.log('PASS: online SocketIO atomic playMove works for both seats');
  c0.stop();
  c1.stop();
  process.exit(0);
}

main().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
