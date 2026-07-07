import { CheckersGame } from '../src/game/game.ts';
import { initialState } from '../src/game/logic.ts';

const selectSquare = CheckersGame.moves!.selectSquare as Function;

const events = { endTurn: () => {} };

function ctxFor(player: string) {
  return { currentPlayer: player, numPlayers: 2 };
}

let G = initialState();

// Red's turn: select red piece
G = selectSquare({ G, ctx: ctxFor('0'), playerID: null, events }, 1, 2);
if (!G.selected || G.validMoves.length === 0) {
  console.error('FAIL: red should select piece at 1,2');
  process.exit(1);
}

// Red's turn: cannot select black piece
const afterRedSelect = G;
G = selectSquare({ G: afterRedSelect, ctx: ctxFor('0'), playerID: null, events }, 6, 1);
if (G.selected?.row === 6 && G.selected?.col === 1) {
  console.error('FAIL: cannot select black piece on red turn');
  process.exit(1);
}

// Black's turn: can select black piece
G = selectSquare(
  { G: { ...afterRedSelect, selected: null, validMoves: [] }, ctx: ctxFor('1'), playerID: null, events },
  6,
  1,
);
if (!G.selected || G.board[G.selected.row][G.selected.col]?.color !== 'black') {
  console.error('FAIL: black should select black piece on black turn');
  process.exit(1);
}

// Black's turn: cannot select red piece
G = selectSquare({ G, ctx: ctxFor('1'), playerID: null, events }, 1, 2);
if (G.selected?.row === 1 && G.selected?.col === 2) {
  console.error('FAIL: cannot select red piece on black turn');
  process.exit(1);
}

console.log('PASS: local turn color enforcement');
