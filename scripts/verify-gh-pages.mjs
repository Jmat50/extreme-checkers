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
if (!js.includes('/extreme-checkers/') || !js.includes('models/board.glb')) {
  fail('JS bundle does not contain GitHub Pages asset paths');
}

const required = [
  'models/board.glb',
  'models/piece-red.glb',
  'models/piece-red-king.glb',
  'models/piece-black-king.glb',
  'hdri/studio.hdr',
  'textures/board/CheckerBoard_Board_BaseColor.png',
  'icons/bomb.png',
];

for (const asset of required) {
  const file = path.join(dist, asset);
  if (!fs.existsSync(file)) fail(`Missing dist asset: ${asset}`);
}

console.log('OK: GitHub Pages build paths verified');
console.log(`  JS bundle: ${jsFile}`);
console.log(`  Assets checked: ${required.length}`);
