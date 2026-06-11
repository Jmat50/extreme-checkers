import { BOARD_SIZE } from '../game/types';

/** Measured from CheckerBoard.obj board plane vertices. */
const BOARD_MIN = -3.215868;
const BOARD_MAX = 3.215868;
const BOARD_SPAN = BOARD_MAX - BOARD_MIN;
export const SQUARE_SIZE = BOARD_SPAN / BOARD_SIZE;
const BOARD_Y = 0.268418;
const PIECE_LIFT = 0.12;

export function gridToWorld(row: number, col: number): [number, number, number] {
  const x = BOARD_MIN + (col + 0.5) * SQUARE_SIZE;
  const z = BOARD_MAX - (row + 0.5) * SQUARE_SIZE;
  return [x, BOARD_Y + PIECE_LIFT, z];
}

export function worldToGrid(x: number, z: number): { row: number; col: number } | null {
  const col = Math.floor((x - BOARD_MIN) / SQUARE_SIZE);
  const row = Math.floor((BOARD_MAX - z) / SQUARE_SIZE);
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return { row, col };
}
