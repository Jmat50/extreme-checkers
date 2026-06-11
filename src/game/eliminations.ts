import { isHazardSquare } from './hazards';
import type { Move, Position } from './types';

export function getEliminationSites(move: Move): Position[] {
  const sites: Position[] = [];
  const seen = new Set<string>();

  const add = (row: number, col: number) => {
    const key = `${row},${col}`;
    if (seen.has(key)) return;
    seen.add(key);
    sites.push({ row, col });
  };

  move.captures?.forEach(({ row, col }) => add(row, col));
  if (isHazardSquare(move.to.row, move.to.col)) {
    add(move.to.row, move.to.col);
  }

  return sites;
}
