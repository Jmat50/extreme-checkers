import { useGLTF } from '@react-three/drei';
import { MODEL } from './modelPaths';
import { EXPLOSION_VIDEO } from './explosionVideo';

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;

function getHttpStatus(error: unknown): number | undefined {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/responded with (\d+)/);
  return match ? Number(match[1]) : undefined;
}

function isRetryable(error: unknown): boolean {
  const status = getHttpStatus(error);
  if (status !== undefined) return RETRYABLE_STATUS.has(status);
  return error instanceof TypeError;
}

async function preloadGltf(url: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await useGLTF.preload(url);
      return;
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === MAX_ATTEMPTS - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function preloadVideo(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.oncanplaythrough = () => resolve();
    video.onerror = () => reject(new Error(`Could not preload ${url}`));
    video.src = url;
    video.load();
  });
}

/** Load scene GLBs one at a time with retries (avoids GitHub Pages 503 bursts). */
export async function preloadGameAssets(): Promise<void> {
  const urls = [MODEL.board, MODEL.pieceRedKing, MODEL.pieceBlackKing];
  for (const url of urls) {
    await preloadGltf(url);
  }
  await preloadVideo(EXPLOSION_VIDEO);
}
