import { Bot } from 'boardgame.io/ai';
import type { Ctx, Game, PlayerID, State } from 'boardgame.io';
import { pickAiMove } from './game';
import { getAllMoves, movesEqual } from './logic';
import { CheckersState, PLAYER_COLORS, PieceColor } from './types';

export class CheckersBot extends Bot {
  constructor(opts: { enumerate: NonNullable<Game['ai']>['enumerate']; seed?: string | number }) {
    super(opts);
  }

  play(state: State, playerID: PlayerID) {
    const G = state.G as CheckersState;
    const color = PLAYER_COLORS[playerID] as PieceColor;
    const actions = this.enumerate(G, state.ctx as Ctx, playerID);
    const move = pickAiMove(G, color);
    if (!move) {
      return Promise.resolve({ action: actions[0] });
    }
    const allMoves = getAllMoves(G.board, color);
    const index = allMoves.findIndex((m) => movesEqual(m, move));
    return Promise.resolve({ action: actions[index] ?? actions[0] });
  }
}
