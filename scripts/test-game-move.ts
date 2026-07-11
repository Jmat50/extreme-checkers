import { CheckersGame } from '../src/game/game.ts';
import { initialState } from '../src/game/logic.ts';

// Simulate selectSquare like boardgame.io would
const G0 = initialState();
const ctx = { currentPlayer: '0', numPlayers: 2, playOrder: ['0', '1'] };
const events = { endTurn: () => console.log('endTurn called') };

const selectSquare = CheckersGame.moves!.selectSquare as Function;

// Select red piece at row 1 col 2
let G1 = selectSquare({ G: G0, ctx, playerID: null, events }, 1, 2);
console.log('after select:', {
  selected: G1.selected,
  validMoves: G1.validMoves.map((m: { to: { row: number; col: number } }) => m.to),
});

// Move to row 0 col 1 (hazard - piece eliminated)
let G2 = selectSquare({ G: G1, ctx, playerID: null, events }, 0, 1);
console.log('after move:', {
  pieceAtFrom: G2.board[1][2],
  pieceAtTo: G2.board[0][1],
  redCount: G2.board.flat().filter((c) => c?.color === 'red').length,
  selected: G2.selected,
  winner: G2.winner,
});
