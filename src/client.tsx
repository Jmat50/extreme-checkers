import { Client } from 'boardgame.io/react';
import { Local, SocketIO } from 'boardgame.io/multiplayer';
import type { BoardProps } from 'boardgame.io/react';
import { CheckersGame } from './game/game';
import { createCheckersBot } from './game/bot';
import { AI_DIFFICULTY_DEFAULT } from './game/ai';
import { GameBoard } from './components/GameBoard';
import type { LobbyConfig } from './components/Lobby';
import { CheckersState } from './game/types';
import { getGameServerUrl } from './config/serverUrl';

export function createGameClient(config: LobbyConfig) {
  const difficulty = config.aiDifficulty ?? AI_DIFFICULTY_DEFAULT;
  const BoardWrapper = (props: BoardProps<CheckersState>) => (
    <GameBoard
      {...props}
      mode={config.mode}
      playerName={config.playerName}
      opponentName={
        config.mode === 'ai' ? `AI (${difficulty})` : config.opponentName ?? 'Opponent'
      }
      onLeave={() => config.onLeave?.()}
    />
  );

  return Client({
    game: CheckersGame,
    board: BoardWrapper,
    debug: false,
    multiplayer:
      config.mode === 'online'
        ? SocketIO({ server: getGameServerUrl() })
        : config.mode === 'ai'
          ? Local({ bots: { '1': createCheckersBot(difficulty) } })
          : undefined,
  });
}
