import {
  BOARD_SIZE,
  Cell,
  CheckersState,
  Move,
  Piece,
  PieceColor,
  Position,
} from './types';
import { isHazardSquare } from './hazards';
import { getEliminationSites } from './eliminations';
import { getGameConfig } from '../config/configStore';

export { isHazardSquare, getHazardSquares } from './hazards';

export function createInitialBoard(): Cell[][] {
  const { rules } = getGameConfig();
  const board: Cell[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );

  const king = rules.allPiecesStartAsKings;

  for (const { row, col } of rules.startBlack) {
    board[row][col] = { color: 'black', king };
  }
  for (const { row, col } of rules.startRed) {
    board[row][col] = { color: 'red', king };
  }

  return board;
}

export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

export function posKey(p: Position): string {
  return `${p.row},${p.col}`;
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function isDarkSquare(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

function moveDirs(): [number, number][] {
  return [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ];
}

function placePiece(board: Cell[][], pos: Position, piece: Piece): void {
  if (isHazardSquare(pos.row, pos.col)) {
    board[pos.row][pos.col] = null;
  } else {
    const king = getGameConfig().rules.allPiecesStartAsKings ? true : piece.king;
    board[pos.row][pos.col] = { ...piece, king };
  }
}

export function getPieceAt(board: Cell[][], pos: Position): Piece | null {
  if (!inBounds(pos.row, pos.col)) return null;
  return board[pos.row][pos.col];
}

function applyMove(board: Cell[][], move: Move): Cell[][] {
  const next = cloneBoard(board);
  const piece = next[move.from.row][move.from.col];
  if (!piece) return next;

  next[move.from.row][move.from.col] = null;
  move.captures?.forEach(({ row, col }) => {
    next[row][col] = null;
  });

  placePiece(next, move.to, piece);
  return next;
}

function slideMoves(board: Cell[][], from: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  for (const [dr, dc] of moveDirs()) {
    const to = { row: from.row + dr, col: from.col + dc };
    if (!inBounds(to.row, to.col)) continue;
    if (!isDarkSquare(to.row, to.col)) continue;
    if (board[to.row][to.col] === null) {
      moves.push({ from, to });
    }
  }
  return moves;
}

/**
 * Single-step jumps only. Multi-jump chains are driven by `mustContinueFrom`
 * in executeMove, so every intermediate landing square is a selectable target.
 * (Returning only maximal chains hid the adjacent landing square and made
 * jumps look impossible in the UI.)
 */
function captureMovesFrom(
  board: Cell[][],
  from: Position,
  piece: Piece,
): Move[] {
  const moves: Move[] = [];

  for (const [dr, dc] of moveDirs()) {
    const mid = { row: from.row + dr, col: from.col + dc };
    const land = { row: from.row + dr * 2, col: from.col + dc * 2 };

    if (!inBounds(land.row, land.col)) continue;
    if (!isDarkSquare(land.row, land.col)) continue;

    const midPiece = board[mid.row][mid.col];
    if (!midPiece || midPiece.color === piece.color) continue;
    if (board[land.row][land.col] !== null) continue;

    moves.push({ from, to: land, captures: [mid] });
  }

  return moves;
}

/**
 * All moves the current player may legally submit right now.
 * Mid multi-jump, only continuation jumps from `mustContinueFrom` are legal.
 */
export function getLegalMoves(
  board: Cell[][],
  color: PieceColor,
  mustContinueFrom: Position | null,
): Move[] {
  if (mustContinueFrom) {
    return getMovesForPiece(board, mustContinueFrom).filter(
      (m) => m.captures?.length,
    );
  }
  return getAllMoves(board, color);
}

export function getMovesForPiece(board: Cell[][], from: Position): Move[] {
  const piece = getPieceAt(board, from);
  if (!piece) return [];

  const captures = captureMovesFrom(board, from, piece);
  if (captures.length > 0) {
    return captures.filter((m) => m.captures && m.captures.length > 0);
  }
  return slideMoves(board, from, piece);
}

/** Valid moves when selecting a piece (respects forced capture and multi-jump). */
export function getValidMovesForSelection(
  board: Cell[][],
  pos: Position,
  color: PieceColor,
  mustContinueFrom: Position | null,
): Move[] {
  if (mustContinueFrom) {
    if (pos.row !== mustContinueFrom.row || pos.col !== mustContinueFrom.col) {
      return [];
    }
    return getMovesForPiece(board, pos).filter((m) => m.captures?.length);
  }

  const piece = getPieceAt(board, pos);
  if (!piece || piece.color !== color) return [];

  const validMoves = getMovesForPiece(board, pos);
  const allMoves = getAllMoves(board, color);
  const mustCapture = allMoves.some((m) => m.captures?.length);
  return mustCapture
    ? validMoves.filter((m) => m.captures?.length)
    : validMoves;
}

export function getAllMoves(board: Cell[][], color: PieceColor): Move[] {
  const moves: Move[] = [];
  let hasCapture = false;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== color) continue;
      const pieceCaptures = captureMovesFrom(board, { row, col }, piece);
      if (pieceCaptures.length > 0) {
        hasCapture = true;
        moves.push(...pieceCaptures);
      }
    }
  }

  if (hasCapture) return moves;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col];
      if (!piece || piece.color !== color) continue;
      moves.push(...slideMoves(board, { row, col }, piece));
    }
  }

  return moves;
}

export function movesEqual(a: Move, b: Move): boolean {
  return (
    a.from.row === b.from.row &&
    a.from.col === b.from.col &&
    a.to.row === b.to.row &&
    a.to.col === b.to.col &&
    (a.captures?.length ?? 0) === (b.captures?.length ?? 0)
  );
}

export function findWinner(board: Cell[][]): PieceColor | null {
  const counts = { red: 0, black: 0 };
  for (const row of board) {
    for (const cell of row) {
      if (cell) counts[cell.color]++;
    }
  }
  if (counts.red === 0) return 'black';
  if (counts.black === 0) return 'red';
  return null;
}

export function executeMove(state: CheckersState, move: Move): CheckersState {
  const board = applyMove(state.board, move);
  const piece = board[move.to.row][move.to.col];
  let mustContinueFrom: Position | null = null;

  if (piece && move.captures && move.captures.length > 0) {
    const moreCaptures = captureMovesFrom(board, move.to, piece).filter(
      (m) => m.captures && m.captures.length > 0,
    );
    if (moreCaptures.length > 0) {
      mustContinueFrom = move.to;
    }
  }

  const winner = findWinner(board);
  const eliminations = getEliminationSites(move);
  return {
    board,
    selected: mustContinueFrom,
    validMoves: mustContinueFrom
      ? getMovesForPiece(board, mustContinueFrom).filter((m) => m.captures?.length)
      : [],
    mustContinueFrom,
    winner,
    lastMove: move,
    eliminationFlash: eliminations.length > 0 ? state.eliminationFlash + 1 : state.eliminationFlash,
    lastEliminations: eliminations,
  };
}

export function initialState(): CheckersState {
  return {
    board: createInitialBoard(),
    selected: null,
    validMoves: [],
    mustContinueFrom: null,
    winner: null,
    lastMove: null,
    eliminationFlash: 0,
    lastEliminations: [],
  };
}
