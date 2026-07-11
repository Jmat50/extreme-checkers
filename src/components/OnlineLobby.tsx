import { useCallback, useEffect, useRef, useState } from 'react';
import type { LobbyConfig } from './Lobby';
import {
  countFilledSeats,
  createAndJoin,
  hostName,
  joinOpenMatch,
  leaveSeat,
  listOpenMatches,
  lobbyErrorMessage,
  opponentNameFromMatch,
  type OpenMatch,
  type SeatSession,
  waitUntilFull,
} from '../lobby/lobbyClient';

interface OnlineLobbyProps {
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  onStart: (config: LobbyConfig) => void;
  onBack: () => void;
}

type WaitingState = SeatSession & { unlisted: boolean };

export function OnlineLobby({
  playerName,
  onPlayerNameChange,
  onStart,
  onBack,
}: OnlineLobbyProps) {
  const [matches, setMatches] = useState<OpenMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [joinID, setJoinID] = useState('');
  const [waiting, setWaiting] = useState<WaitingState | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshList = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const open = await listOpenMatches();
      setMatches(open);
      if (!silent) setError('');
    } catch (e) {
      setError(lobbyErrorMessage(e, 'Failed to load open matches'));
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (waiting) return;
    void refreshList();
    const timer = setInterval(() => {
      void refreshList(true);
    }, 2500);
    return () => clearInterval(timer);
  }, [refreshList, waiting]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const startFromSession = async (session: SeatSession) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const match = await waitUntilFull(session.matchID, {
        intervalMs: 400,
        signal: controller.signal,
      });
      onStart({
        mode: 'online',
        playerName: playerName.trim() || 'Name',
        matchID: session.matchID,
        playerID: session.playerID,
        credentials: session.credentials,
        opponentName: opponentNameFromMatch(match, session.playerID),
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(lobbyErrorMessage(e, 'Failed to start match'));
    }
  };

  const beginWaiting = (session: SeatSession, unlisted: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setWaiting({ ...session, unlisted });
    setError('');
    void (async () => {
      try {
        const match = await waitUntilFull(session.matchID, {
          intervalMs: 1000,
          signal: controller.signal,
        });
        onStart({
          mode: 'online',
          playerName: playerName.trim() || 'Name',
          matchID: session.matchID,
          playerID: session.playerID,
          credentials: session.credentials,
          opponentName: opponentNameFromMatch(match, session.playerID),
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(lobbyErrorMessage(e, 'Failed while waiting for opponent'));
        setWaiting(null);
      }
    })();
  };

  const createMatch = async (unlisted: boolean) => {
    setLoading(true);
    setError('');
    try {
      const session = await createAndJoin(playerName, { unlisted });
      beginWaiting(session, unlisted);
    } catch (e) {
      setError(lobbyErrorMessage(e, 'Failed to create match'));
    } finally {
      setLoading(false);
    }
  };

  const joinMatch = async (matchID: string) => {
    if (!matchID.trim()) return;
    setLoading(true);
    setError('');
    try {
      const session = await joinOpenMatch(matchID, playerName);
      await startFromSession(session);
    } catch (e) {
      setError(lobbyErrorMessage(e, 'Failed to join match'));
    } finally {
      setLoading(false);
    }
  };

  const cancelWaiting = async () => {
    const session = waiting;
    abortRef.current?.abort();
    abortRef.current = null;
    setWaiting(null);
    if (session) {
      try {
        await leaveSeat(session.matchID, session.playerID, session.credentials);
      } catch {
        // best-effort cleanup
      }
    }
    void refreshList();
  };

  if (waiting) {
    return (
      <div className="online-lobby">
        <header id="header">
          <h1>Waiting for opponent</h1>
          <p>
            {waiting.unlisted
              ? 'Private match created. Share the match ID below.'
              : 'Your public match is listed in the lobby. Waiting for a second player…'}
          </p>
        </header>

        <p className="lobby-match-code">
          Match ID: <strong>{waiting.matchID}</strong>
        </p>

        <div className="online-lobby-actions">
          <button
            type="button"
            className="button button--secondary"
            disabled={loading}
            onClick={() => void cancelWaiting()}
          >
            Cancel
          </button>
        </div>

        {error && <p className="lobby-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="online-lobby">
      <header id="header">
        <h1>Online Multiplayer Lobby</h1>
        <p>Browse open public matches or create one for others to join.</p>
      </header>

      <form
        id="signup-form"
        className="lobby-form online-lobby-create"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          type="text"
          name="playerName"
          placeholder="Name"
          value={playerName}
          onChange={(e) => onPlayerNameChange(e.target.value)}
          maxLength={20}
          aria-label="Name"
        />
        <button
          type="button"
          className="button"
          disabled={loading}
          onClick={() => void createMatch(false)}
        >
          Create Public Match
        </button>
        <button
          type="button"
          className="button button--secondary"
          disabled={loading}
          onClick={() => void createMatch(true)}
        >
          Create Private Match
        </button>
      </form>

      <div className="online-lobby-list-header">
        <h2>Open matches</h2>
        <button
          type="button"
          className="button button--secondary"
          disabled={loading || refreshing}
          onClick={() => void refreshList()}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {matches.length === 0 ? (
        <p className="online-lobby-empty">No open public matches right now.</p>
      ) : (
        <ul className="online-lobby-list" aria-label="Open matches">
          {matches.map((match) => {
            const filled = countFilledSeats(match);
            return (
              <li key={match.matchID} className="online-lobby-row">
                <div className="online-lobby-row-info">
                  <span className="online-lobby-host">{hostName(match)}</span>
                  <span className="online-lobby-meta">
                    {filled}/2 players · {match.matchID.slice(0, 8)}…
                  </span>
                </div>
                <button
                  type="button"
                  className="button"
                  disabled={loading}
                  onClick={() => void joinMatch(match.matchID)}
                >
                  Join
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form
        className="lobby-join-form"
        onSubmit={(e) => {
          e.preventDefault();
          void joinMatch(joinID);
        }}
      >
        <input
          type="text"
          placeholder="Join with match ID"
          value={joinID}
          onChange={(e) => setJoinID(e.target.value.trim())}
          maxLength={64}
          aria-label="Join with match ID"
        />
        <button
          type="submit"
          className="button button--secondary"
          disabled={loading || !joinID.trim()}
        >
          Join Match
        </button>
      </form>

      <div className="online-lobby-actions">
        <button
          type="button"
          className="button button--secondary"
          disabled={loading}
          onClick={onBack}
        >
          Back
        </button>
      </div>

      {error && <p className="lobby-error">{error}</p>}
    </div>
  );
}
