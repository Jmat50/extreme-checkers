import { Bot } from 'boardgame.io/ai';
import type { Ctx, Game, PlayerID, State } from 'boardgame.io';
import { AI_DIFFICULTY_DEFAULT, pickAiMove } from './ai';
import { getLegalMoves, movesEqual } from './logic';
import { CheckersState, PLAYER_COLORS, PieceColor } from './types';

export function createCheckersBot(difficulty: number = AI_DIFFICULTY_DEFAULT) {
  return class CheckersBot extends Bot {
    constructor(opts: {
      enumerate: NonNullable<Game['ai']>['enumerate'];
      seed?: string | number;
    }) {
      super(opts);
    }

    play(state: State, playerID: PlayerID) {
      const G = state.G as CheckersState;
      const color = PLAYER_COLORS[playerID] as PieceColor;
      const actions = this.enumerate(G, state.ctx as Ctx, playerID);
      const move = pickAiMove(G, color, difficulty);
      if (!move) {
        return Promise.resolve({ action: actions[0] });
      }
      // Must mirror ai.enumerate ordering (getLegalMoves) for index mapping.
      const allMoves = getLegalMoves(G.board, color, G.mustContinueFrom);
      const index = allMoves.findIndex((m) => movesEqual(m, move));
      return Promise.resolve({ action: actions[index] ?? actions[0] });
    }
  };
}

/** Default bot used when difficulty is not specified. */
export const CheckersBot = createCheckersBot(AI_DIFFICULTY_DEFAULT);
