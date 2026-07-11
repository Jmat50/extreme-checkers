import { useState } from 'react';
import { isOnlineMultiplayerConfigured } from '../config/serverUrl';
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
  onLeave?: () => void;
}

interface LobbyProps {
  onStart: (config: LobbyConfig) => void;
}

export function Lobby({ onStart }: LobbyProps) {
  const [playerName, setPlayerName] = useState('Player');
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
          placeholder="Your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          maxLength={20}
          aria-label="Your name"
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
          onClick={() => onStart({ mode: 'ai', playerName, playerID: '0' })}
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
