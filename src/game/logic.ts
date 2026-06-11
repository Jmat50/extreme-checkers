import {
  BOARD_SIZE,
  Cell,
  CheckersState,
  Move,
  Piece,
  PieceColor,
  Position,
} from './types';

export function createInitialBoard(): Cell[][] {
  const board: Cell[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if ((row + col) % 2 !== 1) continue;
      if (row < 3) {
        board[row][col] = { color: 'black', king: false };
      } else if (row > 4) {
        board[row][col] = { color: 'red', king: false };
      }
    }
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

function forwardDirs(piece: Piece): [number, number][] {
  if (piece.king) {
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];
  }
  return piece.color === 'red'
    ? [[-1, -1], [-1, 1]]
    : [[1, -1], [1, 1]];
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

  let promoted = piece.king;
  if (!promoted) {
    if (piece.color === 'red' && move.to.row === 0) promoted = true;
    if (piece.color === 'black' && move.to.row === BOARD_SIZE - 1) promoted = true;
  }

  next[move.to.row][move.to.col] = { ...piece, king: promoted };
  return next;
}

function slideMoves(board: Cell[][], from: Position, piece: Piece): Move[] {
  const moves: Move[] = [];
  for (const [dr, dc] of forwardDirs(piece)) {
    const to = { row: from.row + dr, col: from.col + dc };
    if (!inBounds(to.row, to.col)) continue;
    if (!isDarkSquare(to.row, to.col)) continue;
    if (board[to.row][to.col] === null) {
      moves.push({ from, to });
    }
  }
  return moves;
}

function captureMovesFrom(
  board: Cell[][],
  from: Position,
  piece: Piece,
  origin: Position = from,
  capturesSoFar: Position[] = [],
): Move[] {
  const moves: Move[] = [];
  let foundCapture = false;

  for (const [dr, dc] of forwardDirs(piece)) {
    const mid = { row: from.row + dr, col: from.col + dc };
    const land = { row: from.row + dr * 2, col: from.col + dc * 2 };

    if (!inBounds(land.row, land.col)) continue;
    if (!isDarkSquare(land.row, land.col)) continue;

    const midPiece = board[mid.row][mid.col];
    if (!midPiece || midPiece.color === piece.color) continue;
    if (capturesSoFar.some((c) => c.row === mid.row && c.col === mid.col)) continue;
    if (board[land.row][land.col] !== null) continue;

    foundCapture = true;
    const newCaptures = [...capturesSoFar, mid];
    const tempBoard = cloneBoard(board);
    tempBoard[from.row][from.col] = null;
    newCaptures.forEach(({ row, col }) => {
      tempBoard[row][col] = null;
    });

    let promoted = piece.king;
    if (!promoted) {
      if (piece.color === 'red' && land.row === 0) promoted = true;
      if (piece.color === 'black' && land.row === BOARD_SIZE - 1) promoted = true;
    }
    tempBoard[land.row][land.col] = { ...piece, king: promoted };

    const further = captureMovesFrom(tempBoard, land, { ...piece, king: promoted }, origin, newCaptures);
    if (further.length > 0) {
      moves.push(...further);
    } else {
      moves.push({ from: origin, to: land, captures: newCaptures });
    }
  }

  return moves;
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
  return {
    board,
    selected: mustContinueFrom,
    validMoves: mustContinueFrom
      ? getMovesForPiece(board, mustContinueFrom).filter((m) => m.captures?.length)
      : [],
    mustContinueFrom,
    winner,
    lastMove: move,
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
  };
}
