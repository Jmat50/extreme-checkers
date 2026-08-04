import { Bot } from 'boardgame.io/ai';
import type { Ctx, Game, PlayerID, State } from 'boardgame.io';
import { AI_DIFFICULTY_DEFAULT, aiMistakeChance, pickAiMove } from './ai';
import { getLegalMoves, movesEqual } from './logic';
import { CheckersState, PLAYER_COLORS, PieceColor } from './types';

export function createCheckersBot(difficulty: number = AI_DIFFICULTY_DEFAULT) {
  const mistakeChance = aiMistakeChance(difficulty);

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

      // Enumerate returns MAKE_MOVE actions already; find the matching root hop
      // then rewrite args so playMove receives mistakeChance for soft chains.
      const allMoves = getLegalMoves(G.board, color, G.mustContinueFrom);
      const index = allMoves.findIndex((m) => movesEqual(m, move));
      const base = actions[index] ?? actions[0];
      if (!base || !('payload' in base)) {
        return Promise.resolve({ action: base });
      }

      const legal = allMoves[index] ?? allMoves[0];
      return Promise.resolve({
        action: {
          ...base,
          payload: {
            ...base.payload,
            args: [legal, true, mistakeChance],
          },
        },
      });
    }
  };
}

/** Default bot used when difficulty is not specified. */
export const CheckersBot = createCheckersBot(AI_DIFFICULTY_DEFAULT);
