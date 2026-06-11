import type { Ctx } from 'boardgame.io';
import { CheckersState, PLAYER_COLORS } from '../game/types';
import './GameUI.css';

interface GameUIProps {
  G: CheckersState;
  ctx: Ctx;
  playerID: string | null;
  playerName: string;
  opponentName: string;
  mode: 'local' | 'online' | 'ai';
  onLeave: () => void;
}

export function GameUI({
  G,
  ctx,
  playerID,
  playerName,
  opponentName,
  mode,
  onLeave,
}: GameUIProps) {
  const currentColor = PLAYER_COLORS[ctx.currentPlayer];
  const isMyTurn =
    mode === 'local' ||
    ((mode === 'ai' || mode === 'online') && ctx.currentPlayer === playerID);

  const winner = ctx.gameover?.winner ?? G.winner;

  return (
    <div className="game-ui">
      <header className="game-header">
        <h1>Extreme Checkers</h1>
        <button type="button" className="btn-secondary" onClick={onLeave}>
          Leave
        </button>
      </header>

      <div className="status-panel">
        <div className="player-card red">
          <span className="piece-dot red" />
          <div>
            <strong>{mode === 'ai' ? playerName : playerID === '0' ? playerName : opponentName}</strong>
            <small>Red</small>
          </div>
        </div>
        <div className="turn-indicator">
          {winner ? (
            <span className="winner-text">{winner.toUpperCase()} wins!</span>
          ) : (
            <span className={isMyTurn ? 'your-turn' : 'their-turn'}>
              {isMyTurn ? 'Your turn' : `${currentColor}'s turn`}
            </span>
          )}
        </div>
        <div className="player-card black">
          <span className="piece-dot black" />
          <div>
            <strong>{mode === 'ai' ? 'AI Opponent' : playerID === '1' ? playerName : opponentName}</strong>
            <small>Black</small>
          </div>
        </div>
      </div>

      {G.mustContinueFrom && isMyTurn && (
        <div className="hint-banner">Continue your capture!</div>
      )}
      {!winner && (
        <div className="hint-banner hazard-hint">Bomb squares eliminate any piece that lands on them.</div>
      )}
    </div>
  );
}
