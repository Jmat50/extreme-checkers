import { createRequire } from 'node:module';
import { CheckersGame } from '../src/game/game';

const require = createRequire(import.meta.url);
const { Server, FlatFile, Origins } = require('boardgame.io/server') as typeof import('boardgame.io/server');

const PORT = Number(process.env.PORT) || 8000;
const STORAGE_DIR = process.env.STORAGE_DIR || './storage';

const DEFAULT_ALLOWED_ORIGINS = ['https://jmat50.github.io'];

function parseAllowedOrigins(): Array<string | RegExp> {
  const fromEnv = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const origins: Array<string | RegExp> = [
    Origins.LOCALHOST_IN_DEVELOPMENT,
    ...DEFAULT_ALLOWED_ORIGINS,
    ...fromEnv,
  ];

  const renderUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (renderUrl) origins.push(renderUrl);

  return origins;
}

const server = Server({
  games: [CheckersGame],
  db: new FlatFile({ dir: STORAGE_DIR }),
  origins: parseAllowedOrigins(),
});

server.router.get('/api/health', async (ctx) => {
  ctx.body = { ok: true };
});

server.run(PORT, () => {
  console.log(`Extreme Checkers server listening on port ${PORT}`);
  console.log(`Allowed origins: ${parseAllowedOrigins().map(String).join(', ')}`);
});
