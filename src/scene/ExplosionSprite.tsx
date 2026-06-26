import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import './Board2D.css';

interface ExplosionSpriteProps {
  row: number;
  col: number;
  size: number;
  durationMs: number;
  frameCount: number;
  onComplete: () => void;
}

export function ExplosionSprite({
  row,
  col,
  size,
  durationMs,
  frameCount,
  onComplete,
}: ExplosionSpriteProps) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, onComplete]);

  return (
    <div
      className="explosion-sprite"
      style={{
        gridArea: `${row + 1} / ${col + 1}`,
        '--explosion-size': size,
        '--explosion-duration': `${durationMs}ms`,
        '--explosion-frames': frameCount,
      } as CSSProperties}
      aria-hidden
    >
      <div className="explosion-sprite__burst" />
    </div>
  );
}
