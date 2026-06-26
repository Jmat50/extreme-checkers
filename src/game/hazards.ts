import { getGameConfig } from '../config/configStore';
import type { Position } from './types';

export function getHazardSquares(): Position[] {
  return getGameConfig().rules.hazardSquares;
}

export function isHazardSquare(row: number, col: number): boolean {
  return getHazardSquares().some((p) => p.row === row && p.col === col);
}
