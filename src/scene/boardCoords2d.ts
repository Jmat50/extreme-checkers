import { BOARD_SIZE } from '../game/types';

/** Grid cell index helpers for CSS Grid (row/col 0–7). */
export function isOnBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

/** CSS grid-area: row/col are 1-based for grid placement. */
export function gridArea(row: number, col: number): string {
  return `${row + 1} / ${col + 1}`;
}
