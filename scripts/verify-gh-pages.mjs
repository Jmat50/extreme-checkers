/**
 * Verifies production build asset paths for GitHub Pages.
 * Run after: BASE_PATH=/extreme-checkers/ npm run build
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const base = '/extreme-checkers/';

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!indexHtml.includes(`${base}assets/`)) {
  fail('index.html does not reference namespaced asset paths');
}

const jsFile = indexHtml.match(/src="([^"]+\.js)"/)?.[1];
if (!jsFile) fail('Could not find JS bundle in index.html');

const jsPath = path.join(dist, jsFile.replace(base, ''));
const js = fs.readFileSync(jsPath, 'utf8');
if (!js.includes('/extreme-checkers/') || !js.includes('assets/2d') || !js.includes('piece-red')) {
  fail('JS bundle does not contain GitHub Pages 2D asset paths');
}

const required = [
  'assets/2d/board/square-light.svg',
  'assets/2d/board/square-dark.svg',
  'assets/2d/pieces/piece-red.svg',
  'assets/2d/pieces/piece-black.svg',
  'assets/2d/pieces/piece-red-king.svg',
  'assets/2d/pieces/piece-black-king.svg',
  'assets/2d/icons/bomb.svg',
  'assets/2d/ui/button-primary.svg',
  'icons/bomb.svg',
];

for (const asset of required) {
  const file = path.join(dist, asset);
  if (!fs.existsSync(file)) fail(`Missing dist asset: ${asset}`);
}

console.log('OK: GitHub Pages build paths verified');
console.log(`  JS bundle: ${jsFile}`);
console.log(`  Assets checked: ${required.length}`);
const gameServerUrl = process.env.VITE_GAME_SERVER_URL?.trim();
if (gameServerUrl) {
  console.log(`  Game server URL: ${gameServerUrl}`);
  if (!js.includes(gameServerUrl.replace(/^https?:\/\//, '').split('/')[0])) {
    fail('JS bundle does not embed VITE_GAME_SERVER_URL');
  }
} else {
  console.log('  Game server URL: (not set — online multiplayer disabled on Pages)');
}
