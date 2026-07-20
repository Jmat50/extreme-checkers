import { useState } from 'react';
import { isOnlineMultiplayerConfigured } from '../config/serverUrl';
import {
  AI_DIFFICULTY_DEFAULT,
  AI_DIFFICULTY_MAX,
  AI_DIFFICULTY_MIN,
} from '../game/ai';
import { OnlineLobby } from './OnlineLobby';
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
  const onlineAvailable = isOnlineMultiplayerConfigured();

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
      <header id="header">
        <h1 className="lobby-logo-glitch" data-glitch="Extreme Checkers">
          Extreme Checkers
        </h1>
        <p>
          2D overhead checkers with bombs, captures, and online multiplayer.
          <br />
          Red moves first — pass the device when the turn changes.
        </p>
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
        <label className="lobby-difficulty" htmlFor="ai-difficulty">
          <span className="lobby-difficulty-text">
            AI Difficulty: {aiDifficulty} — {difficultyLabel(aiDifficulty)}
          </span>
          <input
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
        <button
          type="button"
          className="button"
          onClick={() =>
            onStart({
              mode: 'ai',
              playerName,
              playerID: '0',
              aiDifficulty,
            })
          }
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
    </div>
  );
}
