import { useState } from 'react';
import { apiUrl, isOnlineMultiplayerConfigured } from '../config/serverUrl';
import './Lobby.css';

export type GameMode = 'local' | 'online' | 'ai';

export interface LobbyConfig {
  mode: GameMode;
  playerName: string;
  matchID?: string;
  playerID?: string;
  onLeave?: () => void;
}

interface LobbyProps {
  onStart: (config: LobbyConfig) => void;
}

export function Lobby({ onStart }: LobbyProps) {
  const [playerName, setPlayerName] = useState('Player');
  const [matchID, setMatchID] = useState('');
  const [joinID, setJoinID] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const onlineAvailable = isOnlineMultiplayerConfigured();

  const createOnline = async (vsAi: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/lobbies'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, vsAi }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create lobby');
      setMatchID(data.matchID);
      onStart({
        mode: vsAi ? 'ai' : 'online',
        playerName,
        matchID: data.matchID,
        playerID: '0',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const joinOnline = async () => {
    if (!joinID.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl(`/api/lobbies/${joinID.trim().toUpperCase()}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join lobby');
      onStart({
        mode: 'online',
        playerName,
        matchID: data.matchID,
        playerID: data.playerID,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lobby-eventually">
      <header id="header">
        <h1>Extreme Checkers</h1>
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
          disabled={loading}
          onClick={() => onStart({ mode: 'local', playerName })}
        >
          Local 2-Player
        </button>
        <button
          type="button"
          className="button"
          disabled={loading}
          onClick={() => onStart({ mode: 'ai', playerName, playerID: '0' })}
        >
          Play vs AI
        </button>
        <button
          type="button"
          className="button"
          disabled={loading || !onlineAvailable}
          title={onlineAvailable ? undefined : 'Deploy the Render game server and set GAME_SERVER_URL'}
          onClick={() => createOnline(false)}
        >
          Create Online
        </button>
      </form>

      <form
        className="lobby-join-form"
        onSubmit={(e) => {
          e.preventDefault();
          joinOnline();
        }}
      >
        <input
          type="text"
          placeholder="Join code"
          value={joinID}
          onChange={(e) => setJoinID(e.target.value.toUpperCase())}
          maxLength={6}
          aria-label="Join with code"
        />
        <button
          type="submit"
          className="button button--secondary"
          disabled={loading || !joinID.trim() || !onlineAvailable}
          title={onlineAvailable ? undefined : 'Deploy the Render game server and set GAME_SERVER_URL'}
        >
          Join Game
        </button>
      </form>

      {!onlineAvailable && (
        <p className="lobby-hint">
          Online play is not configured for this build. Local and vs AI still work.
        </p>
      )}

      {error && <p className="lobby-error">{error}</p>}

      {matchID && (
        <p className="lobby-match-code">
          Share this code: <strong>{matchID}</strong>
        </p>
      )}
    </div>
  );
}
