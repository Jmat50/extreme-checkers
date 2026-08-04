import { useEffect, useId, useRef, useState } from 'react';
import { isOnlineMultiplayerConfigured } from '../config/serverUrl';
import {
  AI_DIFFICULTY_DEFAULT,
  AI_DIFFICULTY_MAX,
  AI_DIFFICULTY_MIN,
} from '../game/ai';
import { OnlineLobby } from './OnlineLobby';
import { assetUrl } from '../utils/assets';
import './Lobby.css';

export type GameMode = 'local' | 'online' | 'ai';

export interface LobbyConfig {
  mode: GameMode;
  playerName: string;
  matchID?: string;
  playerID?: string;
  credentials?: string;
  opponentName?: string;
  /** 1 (random) … 10 (deep search). Only used for vs AI. */
  aiDifficulty?: number;
  onLeave?: () => void;
}

interface LobbyProps {
  onStart: (config: LobbyConfig) => void;
}

function difficultyLabel(level: number): string {
  if (level <= 2) return 'Beginner';
  if (level <= 4) return 'Easy';
  if (level <= 6) return 'Medium';
  if (level <= 8) return 'Hard';
  return 'Brutal';
}

export function Lobby({ onStart }: LobbyProps) {
  const [playerName, setPlayerName] = useState('Name');
  const [aiDifficulty, setAiDifficulty] = useState(AI_DIFFICULTY_DEFAULT);
  const [view, setView] = useState<'menu' | 'online'>('menu');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const onlineAvailable = isOnlineMultiplayerConfigured();
  const aiDialogTitleId = useId();
  const rulesDialogTitleId = useId();
  const difficultyInputRef = useRef<HTMLInputElement>(null);
  const rulesCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aiDialogOpen) return;

    difficultyInputRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAiDialogOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aiDialogOpen]);

  useEffect(() => {
    if (!rulesOpen) return;

    rulesCloseRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRulesOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rulesOpen]);

  const startAiGame = () => {
    setAiDialogOpen(false);
    onStart({
      mode: 'ai',
      playerName,
      playerID: '0',
      aiDifficulty,
    });
  };

  if (view === 'online') {
    return (
      <div className="lobby-eventually">
        <OnlineLobby
          playerName={playerName}
          onPlayerNameChange={setPlayerName}
          onStart={onStart}
          onBack={() => setView('menu')}
        />
      </div>
    );
  }

  return (
    <div className="lobby-eventually">
      <button
        type="button"
        className="button button--secondary lobby-rules-button"
        onClick={() => setRulesOpen(true)}
      >
        Rules
      </button>

      <header id="header">
        <h1 className="lobby-logo">
          <img
            className="lobby-logo-img"
            src={assetUrl('icons/extreme-checkers-logo.png')}
            alt="Extreme Checkers"
            width={1024}
            height={682}
            decoding="async"
          />
        </h1>
      </header>

      <form
        id="signup-form"
        className="lobby-form"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="text"
          name="playerName"
          id="player-name"
          placeholder="Name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={20}
          aria-label="Name"
        />
        <button
          type="button"
          className="button"
          onClick={() => onStart({ mode: 'local', playerName })}
        >
          Local 2-Player
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setAiDialogOpen(true)}
        >
          Play vs AI
        </button>
        <button
          type="button"
          className="button"
          disabled={!onlineAvailable}
          title={
            onlineAvailable
              ? undefined
              : 'Deploy the Render game server and set GAME_SERVER_URL'
          }
          onClick={() => setView('online')}
        >
          Online Multiplayer Lobby
        </button>
      </form>

      {!onlineAvailable && (
        <p className="lobby-hint">
          Online play is not configured for this build. Local and vs AI still work.
        </p>
      )}

      {aiDialogOpen && (
        <div
          className="lobby-ai-dialog-backdrop"
          onClick={() => setAiDialogOpen(false)}
        >
          <div
            className="lobby-ai-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={aiDialogTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={aiDialogTitleId} className="lobby-ai-dialog-title">
              Play vs AI
            </h2>
            <label className="lobby-difficulty" htmlFor="ai-difficulty">
              <span className="lobby-difficulty-text">
                AI Difficulty: {aiDifficulty} — {difficultyLabel(aiDifficulty)}
              </span>
              <input
                ref={difficultyInputRef}
                type="range"
                id="ai-difficulty"
                min={AI_DIFFICULTY_MIN}
                max={AI_DIFFICULTY_MAX}
                step={1}
                value={aiDifficulty}
                onChange={(e) => setAiDifficulty(Number(e.target.value))}
                aria-valuemin={AI_DIFFICULTY_MIN}
                aria-valuemax={AI_DIFFICULTY_MAX}
                aria-valuenow={aiDifficulty}
                aria-label="AI difficulty"
              />
            </label>
            <div className="lobby-ai-dialog-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setAiDialogOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className="button" onClick={startAiGame}>
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      {rulesOpen && (
        <div
          className="lobby-ai-dialog-backdrop"
          onClick={() => setRulesOpen(false)}
        >
          <div
            className="lobby-ai-dialog lobby-rules-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={rulesDialogTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={rulesDialogTitleId} className="lobby-ai-dialog-title">
              How to Play
            </h2>
            <div className="lobby-rules-body">
              <section>
                <h3>Goal</h3>
                <p>
                  Extreme Checkers is a fast overhead checkers variant on an 8×8
                  board. Capture or corner your opponent until they have no
                  pieces left, or no legal moves on their turn. Red moves first.
                </p>
              </section>

              <section>
                <h3>The board</h3>
                <p>
                  Pieces only move on the dark squares. Each side starts with
                  five pieces. In the default rules every piece moves like a
                  king — one step diagonally in any of the four directions.
                </p>
                <p>
                  Bomb squares are marked with bomb icons. Any piece that{' '}
                  <em>lands</em> on a bomb is destroyed immediately (the capture
                  still counts if you jumped someone on the way).
                </p>
              </section>

              <section>
                <h3>How to move</h3>
                <ul>
                  <li>
                    <strong>Click:</strong> select one of your pieces, then click
                    a green highlighted square.
                  </li>
                  <li>
                    <strong>Drag:</strong> press and drag a piece onto a green
                    square, then release.
                  </li>
                </ul>
                <p>
                  Only your pieces are interactive on your turn. Empty green
                  squares are legal destinations.
                </p>
              </section>

              <section>
                <h3>Slides and jumps</h3>
                <p>
                  A <strong>slide</strong> moves one diagonal step onto an empty
                  dark square.
                </p>
                <p>
                  A <strong>jump</strong> leaps over an adjacent enemy piece onto
                  the empty square just beyond it (still on a dark diagonal).
                  The jumped enemy is removed.
                </p>
                <p>
                  Jumping is <strong>optional</strong>. If a capture is available,
                  you may still slide or move a different piece instead — useful
                  when a jump would land on a bomb or walk into a trap.
                </p>
              </section>

              <section>
                <h3>Multi-jumps</h3>
                <p>
                  After a jump, if that same piece can jump again from its new
                  square, you must continue the chain. The turn stays yours until
                  the piece has no further jumps, or until it is destroyed by a
                  bomb landing.
                </p>
                <p>
                  Mid-chain you cannot switch pieces — only continuation jumps
                  from the chaining piece are legal.
                </p>
              </section>

              <section>
                <h3>Bombs</h3>
                <p>
                  Bombs never move. Landing on one eliminates your piece even if
                  you just captured. Jumping <em>over</em> an enemy onto a safe
                  square is fine; only the landing square matters for bombs.
                </p>
              </section>

              <section>
                <h3>Winning</h3>
                <ul>
                  <li>Eliminate every opposing piece, or</li>
                  <li>
                    Leave the opponent with zero legal moves when it becomes
                    their turn.
                  </li>
                </ul>
              </section>

              <section>
                <h3>Game modes</h3>
                <ul>
                  <li>
                    <strong>Local 2-Player</strong> — hot-seat on one device; pass
                    when the turn indicator flips.
                  </li>
                  <li>
                    <strong>Play vs AI</strong> — you are Red; choose difficulty
                    before starting.
                  </li>
                  <li>
                    <strong>Online Multiplayer</strong> — create or join a match
                    through the lobby when a game server is configured.
                  </li>
                </ul>
              </section>
            </div>
            <div className="lobby-ai-dialog-actions">
              <button
                ref={rulesCloseRef}
                type="button"
                className="button"
                onClick={() => setRulesOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
