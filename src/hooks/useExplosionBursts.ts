import { useCallback, useEffect, useRef, useState } from 'react';
import type { Position } from '../game/types';

export interface ExplosionBurst {
  id: string;
  row: number;
  col: number;
}

export function useExplosionBursts(eliminationFlash: number, eliminations: Position[]) {
  const [bursts, setBursts] = useState<ExplosionBurst[]>([]);
  const lastFlashRef = useRef(0);

  useEffect(() => {
    if (eliminationFlash === 0 || eliminationFlash === lastFlashRef.current) return;
    lastFlashRef.current = eliminationFlash;
    if (eliminations.length === 0) return;

    const stamp = Date.now();
    setBursts((prev) => [
      ...prev,
      ...eliminations.map((site, index) => ({
        id: `${stamp}-${site.row}-${site.col}-${index}`,
        row: site.row,
        col: site.col,
      })),
    ]);
  }, [eliminationFlash, eliminations]);

  const removeBurst = useCallback((id: string) => {
    setBursts((prev) => prev.filter((burst) => burst.id !== id));
  }, []);

  return { bursts, removeBurst };
}
