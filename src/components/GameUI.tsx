import type { Ctx } from 'boardgame.io';
import { CheckersState, PLAYER_COLORS } from '../game/types';
import { ASSETS_2D } from '../scene/assetPaths2d';
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
    (mode === 'ai' || mode === 'online') && ctx.currentPlayer === playerID;

  const winner = ctx.gameover?.winner ?? G.winner;
  const redActive = !winner && currentColor === 'red';
  const blackActive = !winner && currentColor === 'black';

  const redName =
    mode === 'local'
      ? 'Player 1'
      : mode === 'ai'
        ? playerName
        : playerID === '0'
          ? playerName
          : opponentName;

  const blackName =
    mode === 'local'
      ? 'Player 2'
      : mode === 'ai'
        ? 'AI Opponent'
        : playerID === '1'
          ? playerName
          : opponentName;

  const turnLabel = winner
    ? null
    : mode === 'local'
      ? `${currentColor === 'red' ? 'Red' : 'Black'}'s turn`
      : isMyTurn
        ? 'Your turn'
        : `${currentColor}'s turn`;

  const showCaptureHint =
    G.mustContinueFrom &&
    (mode === 'local' || isMyTurn);

  return (
    <div className="game-ui">
      <header className="game-header">
        <h1>Extreme Checkers</h1>
        <button
          type="button"
          className="btn-secondary"
          style={{ backgroundImage: `url(${ASSETS_2D.ui.buttonSecondary})` }}
          onClick={onLeave}
        >
          Leave
        </button>
      </header>

      <div className="status-panel">
        <div
          className={`cyber-player-btn${redActive ? ' cyber-player-btn--active' : ''}`}
          aria-label={`${redName}, Red`}
        >
          <div className="cyber-player-btn__face">
            <span className="cyber-player-btn__name">{redName}</span>
            <span className="cyber-player-btn__glitch" aria-hidden>
              {redName}
            </span>
            <span className="cyber-player-btn__tag">Red</span>
          </div>
        </div>
        <div className="turn-indicator">
          {winner ? (
            <span className="winner-text">{winner.toUpperCase()} wins!</span>
          ) : (
            <span className={isMyTurn ? 'your-turn' : 'their-turn'}>
              {turnLabel}
            </span>
          )}
        </div>
        <div
          className={`cyber-player-btn cyber-player-btn--black${blackActive ? ' cyber-player-btn--active' : ''}`}
          aria-label={`${blackName}, Black`}
        >
          <div className="cyber-player-btn__face">
            <span className="cyber-player-btn__name">{blackName}</span>
            <span className="cyber-player-btn__glitch" aria-hidden>
              {blackName}
            </span>
            <span className="cyber-player-btn__tag">Black</span>
          </div>
        </div>
      </div>

      {showCaptureHint && (
        <div className="hint-banner">Continue your capture!</div>
      )}
      {!winner && (
        <div className="hint-banner hazard-hint">Bomb squares eliminate any piece that lands on them.</div>
      )}
    </div>
  );
}
