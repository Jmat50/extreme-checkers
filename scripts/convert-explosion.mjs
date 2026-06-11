/**
 * Converts source explosion video to web-friendly MP4.
 * Run: npm run convert-explosion
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'vfx');

const sources = [
  path.join(process.env.USERPROFILE ?? '', 'Desktop', 'Xplosion.avi'),
  path.join(root, 'assets', 'vfx', 'Xplosion.avi'),
];

const input = sources.find((p) => fs.existsSync(p));
if (!input) {
  console.error('Source not found. Place Xplosion.avi on Desktop or in assets/vfx/.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const output = path.join(outDir, 'explosion.mp4');

execFileSync(
  ffmpegInstaller.path,
  [
    '-y',
    '-i',
    input,
    '-an',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    output,
  ],
  { stdio: 'inherit' },
);

console.log(`Exported ${output}`);
