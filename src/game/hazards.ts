import { Position } from './types';

/**
 * Bomb / elimination squares (0-indexed).
 * Mapped from user-circled positions on the board image
 * (row 1 = top, row 8 = bottom).
 */
export const HAZARD_SQUARES: readonly Position[] = [
  // Row 1 (top): b8, d8, f8, h8
  { row: 0, col: 1 },
  { row: 0, col: 3 },
  { row: 0, col: 5 },
  { row: 0, col: 7 },
  // Row 2: a2, h2
  { row: 1, col: 0 },
  { row: 1, col: 7 },
  // Row 3: a3
  { row: 2, col: 0 },
  // Row 4: h4
  { row: 3, col: 7 },
  // Row 5: a5
  { row: 4, col: 0 },
  // Row 6: h6
  { row: 5, col: 7 },
  // Row 7: a7, c7, e7, g7
  { row: 6, col: 0 },
  { row: 6, col: 2 },
  { row: 6, col: 4 },
  { row: 6, col: 6 },
  // Row 8 (bottom): b1, d1, f1
  { row: 7, col: 1 },
  { row: 7, col: 3 },
  { row: 7, col: 5 },
];

const hazardKeys = new Set(HAZARD_SQUARES.map((p) => `${p.row},${p.col}`));

export function isHazardSquare(row: number, col: number): boolean {
  return hazardKeys.has(`${row},${col}`);
}
