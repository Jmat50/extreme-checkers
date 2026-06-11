export type PieceColor = 'red' | 'black';

export interface Piece {
  color: PieceColor;
  king: boolean;
}

export type Cell = Piece | null;

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  captures?: Position[];
}

export interface CheckersState {
  board: Cell[][];
  selected: Position | null;
  validMoves: Move[];
  mustContinueFrom: Position | null;
  winner: PieceColor | null;
  lastMove: Move | null;
  /** Increments whenever pieces are eliminated (captures / bombs). */
  eliminationFlash: number;
  lastEliminations: Position[];
}

export const BOARD_SIZE = 8;

export const PLAYER_COLORS: Record<string, PieceColor> = {
  '0': 'red',
  '1': 'black',
};

export const COLOR_TO_PLAYER: Record<PieceColor, string> = {
  red: '0',
  black: '1',
};
