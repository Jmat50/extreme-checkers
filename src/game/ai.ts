import { getGameConfig } from '../config/configStore';
import {
  executeMove,
  getAllMoves,
  getLegalMoves,
  getMovesForPiece,
  isHazardSquare,
} from './logic';
import { CheckersState, Move, PieceColor, Position } from './types';

export const AI_DIFFICULTY_MIN = 1;
export const AI_DIFFICULTY_MAX = 10;
export const AI_DIFFICULTY_DEFAULT = 5;

type DifficultyParams = {
  maxDepth: number;
  timeMs: number;
  randomAmongTop: number;
  /** Probability of picking a clearly suboptimal root move / chain hop. */
  mistakeChance: number;
  /** How far below the best score a "good" candidate may sit. */
  margin: number;
};

/**
 * Maps 1–10 → search budget + selection noise.
 * Low levels stay shallow/noisy; high levels deepen until the time cap.
 */
function difficultyParams(difficulty: number): DifficultyParams {
  const d = Math.max(
    AI_DIFFICULTY_MIN,
    Math.min(AI_DIFFICULTY_MAX, Math.round(difficulty)),
  );
  switch (d) {
    case 1:
      return {
        maxDepth: 0,
        timeMs: 0,
        randomAmongTop: 99,
        mistakeChance: 1,
        margin: 0,
      };
    case 2:
      return {
        maxDepth: 0,
        timeMs: 0,
        randomAmongTop: 8,
        mistakeChance: 0.4,
        margin: 120,
      };
    case 3:
      return {
        maxDepth: 1,
        timeMs: 30,
        randomAmongTop: 5,
        mistakeChance: 0.28,
        margin: 80,
      };
    case 4:
      return {
        maxDepth: 2,
        timeMs: 60,
        randomAmongTop: 4,
        mistakeChance: 0.16,
        margin: 50,
      };
    case 5:
      return {
        maxDepth: 3,
        timeMs: 120,
        randomAmongTop: 2,
        mistakeChance: 0.08,
        margin: 20,
      };
    case 6:
      return {
        maxDepth: 4,
        timeMs: 200,
        randomAmongTop: 1,
        mistakeChance: 0.04,
        margin: 8,
      };
    case 7:
      return {
        maxDepth: 5,
        timeMs: 350,
        randomAmongTop: 1,
        mistakeChance: 0.02,
        margin: 8,
      };
    case 8:
      return {
        maxDepth: 6,
        timeMs: 500,
        randomAmongTop: 1,
        mistakeChance: 0,
        margin: 8,
      };
    case 9:
      return {
        maxDepth: 7,
        timeMs: 750,
        randomAmongTop: 1,
        mistakeChance: 0,
        margin: 8,
      };
    default:
      return {
        maxDepth: 8,
        timeMs: 1000,
        randomAmongTop: 1,
        mistakeChance: 0,
        margin: 8,
      };
  }
}

/** Mistake probability used when the bot auto-completes jump chains. */
export function aiMistakeChance(difficulty: number): number {
  return difficultyParams(difficulty).mistakeChance;
}

function opposite(color: PieceColor): PieceColor {
  return color === 'red' ? 'black' : 'red';
}

function countMaterial(board: CheckersState['board'], color: PieceColor): number {
  let score = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell || cell.color !== color) continue;
      score += cell.king ? 160 : 100;
    }
  }
  return score;
}

/** Higher is better for `forColor`. */
export function evaluatePosition(G: CheckersState, forColor: PieceColor): number {
  if (G.winner === forColor) return 100_000;
  if (G.winner === opposite(forColor)) return -100_000;

  const { ai } = getGameConfig();
  const mine = countMaterial(G.board, forColor);
  const theirs = countMaterial(G.board, opposite(forColor));
  let score = mine - theirs;

  const myMoves = getAllMoves(G.board, forColor);
  const theirMoves = getAllMoves(G.board, opposite(forColor));
  score += myMoves.length * 3;
  score -= theirMoves.length * 3;

  const myCaptures = myMoves.filter((m) => m.captures?.length).length;
  const theirCaptures = theirMoves.filter((m) => m.captures?.length).length;
  score += myCaptures * ai.captureWeight;
  score -= theirCaptures * ai.captureWeight * 1.2;

  for (let row = 0; row < G.board.length; row++) {
    for (let col = 0; col < G.board[row].length; col++) {
      const cell = G.board[row][col];
      if (!cell) continue;
      const progress = cell.color === 'red' ? row : 7 - row;
      const signed = cell.color === forColor ? 1 : -1;
      score += signed * progress * 1.5;
      if (isHazardSquare(row, col)) {
        score -= signed * ai.hazardPenalty;
      }
    }
  }

  return score;
}

function finalizeAiTurn(
  G: CheckersState,
  state: CheckersState,
  allEliminations: Position[],
): CheckersState {
  return {
    ...state,
    selected: null,
    validMoves: [],
    mustContinueFrom: null,
    lastEliminations: allEliminations,
    eliminationFlash:
      allEliminations.length > 0 ? G.eliminationFlash + 1 : G.eliminationFlash,
  };
}

/**
 * From a mid-chain position, finish the jump by picking continuations.
 * With `mistakeChance`, occasionally picks a random hop instead of the
 * eval-maximizing one. Search always passes 0 so evaluation stays optimal.
 */
function finishCaptureChain(
  root: CheckersState,
  state: CheckersState,
  mover: PieceColor,
  eliminations: Position[],
  mistakeChance = 0,
): CheckersState {
  if (!state.mustContinueFrom) {
    return finalizeAiTurn(root, state, eliminations);
  }

  const followUps = getMovesForPiece(state.board, state.mustContinueFrom).filter(
    (m) => m.captures?.length,
  );
  if (followUps.length === 0) {
    return finalizeAiTurn(root, state, eliminations);
  }

  if (mistakeChance > 0 && followUps.length > 1 && Math.random() < mistakeChance) {
    const next = followUps[Math.floor(Math.random() * followUps.length)];
    const stepped = executeMove(state, next);
    return finishCaptureChain(
      root,
      stepped,
      mover,
      [...eliminations, ...stepped.lastEliminations],
      mistakeChance,
    );
  }

  let best: CheckersState | null = null;
  let bestScore = -Infinity;
  for (const next of followUps) {
    const stepped = executeMove(state, next);
    const leaf = finishCaptureChain(
      root,
      stepped,
      mover,
      [...eliminations, ...stepped.lastEliminations],
      mistakeChance,
    );
    const score = evaluatePosition(leaf, mover);
    if (score > bestScore) {
      bestScore = score;
      best = leaf;
    }
  }
  return best!;
}

/**
 * Apply a root move and auto-complete any multi-jump for the AI turn.
 * Pass `mistakeChance > 0` only on the live bot path — search uses the default 0.
 */
export function applyAiMove(
  G: CheckersState,
  move: Move,
  mistakeChance = 0,
): CheckersState {
  const mover = G.board[move.from.row][move.from.col]?.color;
  const started = executeMove(
    { ...G, selected: move.from, validMoves: [move] },
    move,
  );
  const eliminations = [...started.lastEliminations];
  if (!mover || !started.mustContinueFrom) {
    return finalizeAiTurn(G, started, eliminations);
  }
  return finishCaptureChain(G, started, mover, eliminations, mistakeChance);
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort(
    (a, b) => (b.captures?.length ?? 0) - (a.captures?.length ?? 0),
  );
}

function minimax(
  G: CheckersState,
  colorToMove: PieceColor,
  rootColor: PieceColor,
  depth: number,
  alpha: number,
  beta: number,
  deadline: number,
): number | null {
  if (Date.now() > deadline) return null;
  if (G.winner || depth === 0) {
    return evaluatePosition(G, rootColor);
  }

  const moves = orderMoves(getLegalMoves(G.board, colorToMove, G.mustContinueFrom));
  if (moves.length === 0) {
    return evaluatePosition(G, rootColor);
  }

  const maximizing = colorToMove === rootColor;
  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const next = applyAiMove(G, move);
      const score = minimax(
        next,
        opposite(colorToMove),
        rootColor,
        depth - 1,
        alpha,
        beta,
        deadline,
      );
      if (score == null) return null;
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    const next = applyAiMove(G, move);
    const score = minimax(
      next,
      opposite(colorToMove),
      rootColor,
      depth - 1,
      alpha,
      beta,
      deadline,
    );
    if (score == null) return null;
    best = Math.min(best, score);
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function scoreRootMoves(
  G: CheckersState,
  color: PieceColor,
  moves: Move[],
  depth: number,
  deadline: number,
): { move: Move; score: number }[] | null {
  const scored: { move: Move; score: number }[] = [];
  for (const move of moves) {
    const next = applyAiMove(G, move);
    const score =
      depth === 0
        ? evaluatePosition(next, color)
        : minimax(next, opposite(color), color, depth - 1, -Infinity, Infinity, deadline);
    if (score == null) return null;
    scored.push({ move, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

function topBand(
  scored: { move: Move; score: number }[],
  randomAmongTop: number,
  margin: number,
): { move: Move; score: number }[] {
  const topN = Math.max(1, Math.min(randomAmongTop, scored.length));
  const bestScore = scored[0].score;
  return scored
    .slice(0, topN)
    .filter((s) => s.score >= bestScore - margin);
}

export function pickAiMove(
  G: CheckersState,
  color: PieceColor,
  difficulty: number = AI_DIFFICULTY_DEFAULT,
): Move | null {
  const moves = orderMoves(getLegalMoves(G.board, color, G.mustContinueFrom));
  if (moves.length === 0) return null;

  const { maxDepth, timeMs, randomAmongTop, mistakeChance, margin } =
    difficultyParams(difficulty);

  if (maxDepth === 0 && randomAmongTop >= moves.length) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const deadline = Date.now() + Math.max(timeMs, 1);
  let scored = scoreRootMoves(G, color, moves, 0, deadline);
  if (!scored) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Iterative deepening: keep the deepest fully finished ply.
  for (let depth = 1; depth <= maxDepth; depth++) {
    const ordered = scored.map((s) => s.move);
    const next = scoreRootMoves(G, color, ordered, depth, deadline);
    if (!next) break;
    scored = next;
  }

  const candidates = topBand(scored, randomAmongTop, margin);

  // Occasional blunder: pick uniformly among moves outside the top band.
  if (mistakeChance > 0 && Math.random() < mistakeChance) {
    const candidateKeys = new Set(
      candidates.map(
        (c) =>
          `${c.move.from.row},${c.move.from.col}->${c.move.to.row},${c.move.to.col}`,
      ),
    );
    const outside = scored.filter((s) => {
      const key = `${s.move.from.row},${s.move.from.col}->${s.move.to.row},${s.move.to.col}`;
      return !candidateKeys.has(key);
    });
    const pool = outside.length > 0 ? outside : scored;
    return pool[Math.floor(Math.random() * pool.length)].move;
  }

  return candidates[Math.floor(Math.random() * candidates.length)].move;
}
