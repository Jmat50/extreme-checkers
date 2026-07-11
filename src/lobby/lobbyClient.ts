import { LobbyClient, LobbyClientError } from 'boardgame.io/client';
import type { LobbyAPI } from 'boardgame.io';
import { getGameServerUrl } from '../config/serverUrl';

export const GAME_NAME = 'extreme-checkers';

export type OpenMatch = LobbyAPI.Match;

export interface SeatSession {
  matchID: string;
  playerID: string;
  credentials: string;
}

let client: LobbyClient | null = null;

export function getLobbyClient(): LobbyClient {
  const server = getGameServerUrl();
  if (!client) {
    client = new LobbyClient({ server });
  }
  return client;
}

/** Reset cached client when the server URL may have changed (tests / HMR). */
export function resetLobbyClient(): void {
  client = null;
}

export function lobbyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof LobbyClientError) {
    const details = error.details;
    if (typeof details === 'string' && details.trim()) return details;
    if (details && typeof details === 'object' && 'error' in details) {
      const msg = (details as { error?: unknown }).error;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error && error.message) {
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return 'Game server unreachable. If using Render free tier, wait ~1 minute for cold start.';
    }
    return error.message;
  }
  return fallback;
}

export function seatHasPlayer(
  player: LobbyAPI.Match['players'][number] | undefined,
): boolean {
  return Boolean(player?.name);
}

export function countFilledSeats(match: LobbyAPI.Match): number {
  return match.players.filter((p) => seatHasPlayer(p)).length;
}

export function isMatchJoinable(match: LobbyAPI.Match): boolean {
  if (match.gameover != null) return false;
  return match.players.some((p) => !seatHasPlayer(p));
}

export function hostName(match: LobbyAPI.Match): string {
  const host = match.players.find((p) => p.id === 0) ?? match.players[0];
  return host?.name?.trim() || 'Open match';
}

export function opponentNameFromMatch(
  match: LobbyAPI.Match,
  myPlayerID: string,
): string {
  const myId = Number(myPlayerID);
  const other = match.players.find((p) => p.id !== myId);
  return other?.name?.trim() || 'Opponent';
}

export async function listOpenMatches(): Promise<OpenMatch[]> {
  const { matches } = await getLobbyClient().listMatches(GAME_NAME, {
    isGameover: false,
  });
  return matches.filter(isMatchJoinable);
}

export async function createAndJoin(
  playerName: string,
  options: { unlisted?: boolean } = {},
): Promise<SeatSession> {
  const lobby = getLobbyClient();
  const { matchID } = await lobby.createMatch(GAME_NAME, {
    numPlayers: 2,
    unlisted: Boolean(options.unlisted),
  });
  const joined = await lobby.joinMatch(GAME_NAME, matchID, {
    playerName: playerName.trim() || 'Player',
    playerID: '0',
  });
  return {
    matchID,
    playerID: joined.playerID,
    credentials: joined.playerCredentials,
  };
}

export async function joinOpenMatch(
  matchID: string,
  playerName: string,
): Promise<SeatSession> {
  const joined = await getLobbyClient().joinMatch(GAME_NAME, matchID.trim(), {
    playerName: playerName.trim() || 'Player',
  });
  return {
    matchID: matchID.trim(),
    playerID: joined.playerID,
    credentials: joined.playerCredentials,
  };
}

export async function getMatch(matchID: string): Promise<LobbyAPI.Match> {
  return getLobbyClient().getMatch(GAME_NAME, matchID);
}

export function isMatchFull(match: LobbyAPI.Match): boolean {
  return match.players.length > 0 && match.players.every((p) => seatHasPlayer(p));
}

/**
 * Poll until both seats have names, or abort via signal / cancel callback.
 * Resolves with the full match metadata.
 */
export async function waitUntilFull(
  matchID: string,
  options: { intervalMs?: number; signal?: AbortSignal } = {},
): Promise<LobbyAPI.Match> {
  const intervalMs = options.intervalMs ?? 1000;
  const { signal } = options;

  const poll = async (): Promise<LobbyAPI.Match> => {
    if (signal?.aborted) {
      throw new DOMException('Waiting cancelled', 'AbortError');
    }
    const match = await getMatch(matchID);
    if (isMatchFull(match)) return match;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException('Waiting cancelled', 'AbortError'));
      };
      if (signal) {
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
    return poll();
  };

  return poll();
}

export async function leaveSeat(
  matchID: string,
  playerID: string,
  credentials: string,
): Promise<void> {
  await getLobbyClient().leaveMatch(GAME_NAME, matchID, {
    playerID,
    credentials,
  });
}
