import { Game } from 'boardgame.io';
import { CheckersState, Move, PLAYER_COLORS, PieceColor } from './types';
import {
  executeMove,
  getAllMoves,
  getMovesForPiece,
  initialState,
  isHazardSquare,
  movesEqual,
} from './logic';

export interface CheckersGameProps {
  G: CheckersState;
  ctx: { currentPlayer: string; gameover?: { winner: PieceColor } };
  playerID: string | null;
  moves: {
    selectSquare: (row: number, col: number) => void;
    clearSelection: () => void;
  };
  events: { endTurn: () => void };
}

function currentColor(ctx: { currentPlayer: string }): PieceColor {
  return PLAYER_COLORS[ctx.currentPlayer] ?? 'red';
}

function isPlayersTurn(ctx: { currentPlayer: string }, playerID: string | null): boolean {
  if (playerID === null) return true;
  return ctx.currentPlayer === playerID;
}

export const CheckersGame: Game<CheckersState> = {
  name: 'extreme-checkers',
  minPlayers: 2,
  maxPlayers: 2,

  setup: () => initialState(),

  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  moves: {
    selectSquare({ G, ctx, playerID, events }, row: number, col: number) {
      if (G.winner) return G;
      if (!isPlayersTurn(ctx, playerID)) return G;

      const color = currentColor(ctx);
      const pos = { row, col };
      const piece = G.board[row][col];

      const finishMove = (next: CheckersState) => {
        if (next.mustContinueFrom) return next;
        events.endTurn();
        return { ...next, selected: null, validMoves: [] };
      };

      if (G.mustContinueFrom) {
        const mustMove = G.validMoves.find(
          (m) => m.to.row === row && m.to.col === col,
        );
        if (!mustMove) return G;
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
          const validMoves = getMovesForPiece(G.board, pos);
          const allMoves = getAllMoves(G.board, color);
          const mustCapture = allMoves.some((m) => m.captures?.length);
          const filtered = mustCapture
            ? validMoves.filter((m) => m.captures?.length)
            : validMoves;
          return { ...G, selected: pos, validMoves: filtered };
        }

        return { ...G, selected: null, validMoves: [] };
      }

      if (!piece || piece.color !== color) {
        return { ...G, selected: null, validMoves: [] };
      }

      const validMoves = getMovesForPiece(G.board, pos);
      const allMoves = getAllMoves(G.board, color);
      const mustCapture = allMoves.some((m) => m.captures?.length);
      const filtered = mustCapture
        ? validMoves.filter((m) => m.captures?.length)
        : validMoves;

      if (filtered.length === 0) {
        return { ...G, selected: null, validMoves: [] };
      }

      return { ...G, selected: pos, validMoves: filtered };
    },

    playMove({ G, ctx, playerID, events }, move: Move) {
      if (G.winner) return G;
      if (!isPlayersTurn(ctx, playerID)) return G;

      const color = currentColor(ctx);
      const allMoves = getAllMoves(G.board, color);
      const valid = allMoves.find((m) => movesEqual(m, move));
      if (!valid) return G;

      let next = applyAiMove(G, valid);
      if (next.mustContinueFrom) return next;
      events.endTurn();
      return { ...next, selected: null, validMoves: [], mustContinueFrom: null };
    },

    clearSelection({ G }) {
      if (G.mustContinueFrom) return G;
      return { ...G, selected: null, validMoves: [] };
    },
  },

  endIf: ({ G }) => {
    if (G.winner) {
      return { winner: G.winner };
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
  state = executeMove(state, move);
  if (state.mustContinueFrom) {
    const followUps = getMovesForPiece(state.board, state.mustContinueFrom).filter(
      (m) => m.captures?.length,
    );
    if (followUps.length > 0) {
      return applyAiMove(state, followUps[0]);
    }
  }
  return { ...state, selected: null, validMoves: [], mustContinueFrom: null };
}

export function pickAiMove(G: CheckersState, color: PieceColor): Move | null {
  const moves = getAllMoves(G.board, color);
  if (moves.length === 0) return null;

  const scored = moves.map((move) => {
    let score = 0;
    score += (move.captures?.length ?? 0) * 10;
    const result = executeMove(G, move);
    const piece = result.board[move.to.row][move.to.col];
    if (!piece) score -= 50;
    if (isHazardSquare(move.to.row, move.to.col)) score -= 40;
    score += Math.random() * 0.5;
    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].move;
}

export { PLAYER_COLORS };
