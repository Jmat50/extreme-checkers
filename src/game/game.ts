import { Game } from 'boardgame.io';
import { CheckersState, Move, PLAYER_COLORS, PieceColor } from './types';
import {
  executeMove,
  getAllMoves,
  getLegalMoves,
  getValidMovesForSelection,
  initialState,
  movesEqual,
} from './logic';
import { applyAiMove } from './ai';

export { applyAiMove, pickAiMove, AI_DIFFICULTY_DEFAULT } from './ai';

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

    playMove({ G, ctx, playerID, events }, move: Move, autoComplete = false) {
      if (G.winner) return INVALID_MOVE;
      if (!isPlayersTurn(ctx, playerID)) return INVALID_MOVE;
      if (!move || !move.from || !move.to) return INVALID_MOVE;

      const color = currentColor(ctx);
      if (!color) return INVALID_MOVE;

      const legal = getLegalMoves(G.board, color, G.mustContinueFrom);
      const valid = legal.find((m) => movesEqual(m, move));
      if (!valid) return INVALID_MOVE;

      // AI submits with autoComplete: finish the whole jump chain in one move.
      if (autoComplete) {
        const next = applyAiMove(G, valid);
        events.endTurn();
        return { ...next, selected: null, validMoves: [], mustContinueFrom: null };
      }

      // Human path: one step at a time. If more jumps exist from the landing
      // square, keep the turn open so the player continues the chain.
      const next = executeMove(G, valid);
      if (next.mustContinueFrom) return next;
      events.endTurn();
      return { ...next, selected: null, validMoves: [] };
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
      return getLegalMoves(G.board, color, G.mustContinueFrom).map((move) => ({
        move: 'playMove',
        args: [move, true],
      }));
    },
  },
};

export { PLAYER_COLORS };
