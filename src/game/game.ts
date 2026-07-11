import { Game } from 'boardgame.io';
import { getGameConfig } from '../config/configStore';
import { CheckersState, Move, PLAYER_COLORS, PieceColor, Position } from './types';
import {
  executeMove,
  getAllMoves,
  getMovesForPiece,
  getValidMovesForSelection,
  initialState,
  isHazardSquare,
  movesEqual,
} from './logic';

/** boardgame.io rejects moves that return this sentinel (see boardgame.io/core). */
const INVALID_MOVE = 'INVALID_MOVE';

export interface CheckersGameProps {
  G: CheckersState;
  ctx: { currentPlayer: string; gameover?: { winner: PieceColor } };
  playerID: string | null;
  moves: {
    selectSquare: (row: number, col: number) => void;
    playMove: (move: Move) => void;
    clearSelection: () => void;
  };
  events: { endTurn: () => void };
}

function currentColor(ctx: { currentPlayer: string }): PieceColor | null {
  return PLAYER_COLORS[ctx.currentPlayer] ?? null;
}

function isPlayersTurn(
  ctx: { currentPlayer: string },
  playerID: string | null | undefined,
): boolean {
  if (playerID == null) return true;
  return ctx.currentPlayer === playerID;
}

export const CheckersGame: Game<CheckersState> = {
  name: 'extreme-checkers',
  minPlayers: 2,
  maxPlayers: 2,

  setup: () => initialState(),

  // Selection is multi-step UI state — only endTurn() after a real board move.
  // Do not use maxMoves: select/reselect/deselect must not burn the turn.
  turn: {
    onEnd: ({ G }) => ({
      ...G,
      selected: null,
      validMoves: [],
      mustContinueFrom: null,
    }),
  },

  moves: {
    selectSquare({ G, ctx, playerID, events }, row: number, col: number) {
      if (G.winner) return INVALID_MOVE;
      if (!isPlayersTurn(ctx, playerID)) return INVALID_MOVE;

      const color = currentColor(ctx);
      if (!color) return INVALID_MOVE;

      const pos = { row, col };
      const piece = G.board[row][col];

      if (piece && piece.color !== color) {
        const isValidTarget =
          Boolean(G.mustContinueFrom) ||
          (G.selected != null &&
            G.validMoves.some((m) => m.to.row === row && m.to.col === col));
        if (!isValidTarget) return INVALID_MOVE;
      }

      const finishMove = (next: CheckersState) => {
        if (next.mustContinueFrom) return next;
        events.endTurn();
        return { ...next, selected: null, validMoves: [] };
      };

      if (G.mustContinueFrom) {
        const mustMove = G.validMoves.find(
          (m) => m.to.row === row && m.to.col === col,
        );
        if (!mustMove) return INVALID_MOVE;
        return finishMove(executeMove(G, mustMove));
      }

      if (G.selected) {
        const chosen = G.validMoves.find(
          (m) => m.to.row === row && m.to.col === col,
        );
        if (chosen) {
          return finishMove(executeMove(G, chosen));
        }

        if (piece && piece.color === color) {
          const filtered = getValidMovesForSelection(
            G.board,
            pos,
            color,
            G.mustContinueFrom,
          );
          if (filtered.length === 0) {
            return { ...G, selected: null, validMoves: [] };
          }
          return { ...G, selected: pos, validMoves: filtered };
        }

        return { ...G, selected: null, validMoves: [] };
      }

      if (!piece) {
        return INVALID_MOVE;
      }

      const filtered = getValidMovesForSelection(
        G.board,
        pos,
        color,
        G.mustContinueFrom,
      );

      if (filtered.length === 0) {
        return INVALID_MOVE;
      }

      return { ...G, selected: pos, validMoves: filtered };
    },

    playMove({ G, ctx, playerID, events }, move: Move) {
      if (G.winner) return INVALID_MOVE;
      if (!isPlayersTurn(ctx, playerID)) return INVALID_MOVE;

      const color = currentColor(ctx);
      if (!color) return INVALID_MOVE;

      const allMoves = getAllMoves(G.board, color);
      const valid = allMoves.find((m) => movesEqual(m, move));
      if (!valid) return INVALID_MOVE;

      let next = applyAiMove(G, valid);
      if (next.mustContinueFrom) return next;
      events.endTurn();
      return { ...next, selected: null, validMoves: [], mustContinueFrom: null };
    },

    clearSelection({ G }) {
      if (G.mustContinueFrom) return INVALID_MOVE;
      if (!G.selected && G.validMoves.length === 0) return INVALID_MOVE;
      return { ...G, selected: null, validMoves: [] };
    },
  },

  endIf: ({ G, ctx }) => {
    if (G.winner) {
      return { winner: G.winner };
    }
    const color = currentColor(ctx);
    if (color && getAllMoves(G.board, color).length === 0) {
      return { winner: color === 'red' ? 'black' : 'red' };
    }
    return undefined;
  },

  onEnd: ({ G }) => G,

  ai: {
    enumerate: (G, ctx, playerID) => {
      const color = PLAYER_COLORS[playerID ?? ctx.currentPlayer] as PieceColor;
      return getAllMoves(G.board, color).map((move) => ({
        move: 'playMove',
        args: [move],
      }));
    },
  },
};

export function applyAiMove(G: CheckersState, move: Move): CheckersState {
  let state: CheckersState = { ...G, selected: move.from, validMoves: [move] };
  const allEliminations: Position[] = [];

  state = executeMove(state, move);
  allEliminations.push(...state.lastEliminations);

  while (state.mustContinueFrom) {
    const followUps = getMovesForPiece(state.board, state.mustContinueFrom).filter(
      (m) => m.captures?.length,
    );
    if (followUps.length === 0) break;
    state = executeMove(state, followUps[0]);
    allEliminations.push(...state.lastEliminations);
  }

  return {
    ...state,
    selected: null,
    validMoves: [],
    mustContinueFrom: null,
    lastEliminations: allEliminations,
    eliminationFlash: allEliminations.length > 0 ? G.eliminationFlash + 1 : G.eliminationFlash,
  };
}

export function pickAiMove(G: CheckersState, color: PieceColor): Move | null {
  const moves = getAllMoves(G.board, color);
  if (moves.length === 0) return null;

  const scored = moves.map((move) => {
    const ai = getGameConfig().ai;
    let score = 0;
    score += (move.captures?.length ?? 0) * ai.captureWeight;
    const result = executeMove(G, move);
    const piece = result.board[move.to.row][move.to.col];
    if (!piece) score -= ai.selfDestructPenalty;
    if (isHazardSquare(move.to.row, move.to.col)) score -= ai.hazardPenalty;
    score += Math.random() * 0.5;
    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}

export { PLAYER_COLORS };
