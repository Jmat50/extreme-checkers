import { createRequire } from 'node:module';
import koaBody from 'koa-body';
import { CheckersGame } from '../src/game/game';

const require = createRequire(import.meta.url);
const { Server, FlatFile } = require('boardgame.io/server') as typeof import('boardgame.io/server');

const PORT = Number(process.env.PORT) || 8000;

interface LobbyGame {
  id: string;
  players: { id: string; name: string }[];
  vsAi: boolean;
  createdAt: number;
}

const lobbies = new Map<string, LobbyGame>();

function generateId(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const server = Server({
  games: [CheckersGame],
  db: new FlatFile({ dir: './storage' }),
  origins: [/localhost:\d+$/],
});

server.router.get('/api/lobbies', async (ctx) => {
  const list = Array.from(lobbies.values()).filter(
    (l) => l.players.length < (l.vsAi ? 1 : 2),
  );
  ctx.body = list;
});

server.router.post('/api/lobbies', koaBody(), async (ctx) => {
  const body = (ctx.request as { body?: { playerName?: string; vsAi?: boolean } }).body ?? {};
  const id = generateId();
  const player = { id: '0', name: body.playerName || 'Player 1' };
  const lobby: LobbyGame = {
    id,
    players: [player],
    vsAi: Boolean(body.vsAi),
    createdAt: Date.now(),
  };
  lobbies.set(id, lobby);
  ctx.body = { lobby, matchID: id };
});

server.router.get('/api/lobbies/:id', async (ctx) => {
  const lobby = lobbies.get(ctx.params.id);
  if (!lobby) {
    ctx.status = 404;
    ctx.body = { error: 'Lobby not found' };
    return;
  }
  ctx.body = lobby;
});

server.router.post('/api/lobbies/:id', koaBody(), async (ctx) => {
  const lobby = lobbies.get(ctx.params.id);
  if (!lobby) {
    ctx.status = 404;
    ctx.body = { error: 'Lobby not found' };
    return;
  }
  const body = (ctx.request as { body?: { playerName?: string } }).body ?? {};
  if (lobby.vsAi) {
    ctx.status = 400;
    ctx.body = { error: 'AI lobby is full' };
    return;
  }
  if (lobby.players.length >= 2) {
    ctx.status = 400;
    ctx.body = { error: 'Lobby is full' };
    return;
  }
  lobby.players.push({ id: '1', name: body.playerName || 'Player 2' });
  ctx.body = { lobby, matchID: ctx.params.id, playerID: '1' };
});

server.run(PORT, () => {
  console.log(`Extreme Checkers server on http://localhost:${PORT}`);
});
