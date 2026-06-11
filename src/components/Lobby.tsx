import { useState } from 'react';
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

  const createOnline = async (vsAi: boolean) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/lobbies', {
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
      const res = await fetch(`/api/lobbies/${joinID.trim().toUpperCase()}`, {
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
    <div className="lobby">
      <div className="lobby-card">
        <h1>Extreme Checkers</h1>
        <p className="subtitle">3D photorealistic checkers with online multiplayer</p>

        <label className="field">
          <span>Your name</span>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <div className="lobby-actions">
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={() => onStart({ mode: 'local', playerName })}
          >
            Local 2-Player
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={() => onStart({ mode: 'ai', playerName, playerID: '0' })}
          >
            Play vs AI
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={loading}
            onClick={() => createOnline(false)}
          >
            Create Online Game
          </button>
        </div>

        <div className="join-section">
          <label className="field">
            <span>Join with code</span>
            <input
              type="text"
              value={joinID}
              onChange={(e) => setJoinID(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
            />
          </label>
          <button
            type="button"
            className="btn-secondary"
            disabled={loading || !joinID.trim()}
            onClick={joinOnline}
          >
            Join Game
          </button>
        </div>

        {matchID && (
          <p className="match-code">
            Share this code: <strong>{matchID}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
