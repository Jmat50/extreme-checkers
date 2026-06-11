import { Client } from 'boardgame.io/react';
import { Local, SocketIO } from 'boardgame.io/multiplayer';
import type { BoardProps } from 'boardgame.io/react';
import { CheckersGame } from './game/game';
import { CheckersBot } from './game/bot';
import { GameBoard } from './components/GameBoard';
import type { LobbyConfig } from './components/Lobby';
import { CheckersState } from './game/types';

export function createGameClient(config: LobbyConfig) {
  const BoardWrapper = (props: BoardProps<CheckersState>) => (
    <GameBoard
      {...props}
      mode={config.mode}
      playerName={config.playerName}
      opponentName={config.mode === 'ai' ? 'AI' : 'Opponent'}
      onLeave={() => config.onLeave?.()}
    />
  );

  return Client({
    game: CheckersGame,
    board: BoardWrapper,
    debug: false,
    multiplayer:
      config.mode === 'online'
        ? SocketIO({ server: window.location.origin })
        : Local({
            bots: config.mode === 'ai' ? { '1': CheckersBot } : undefined,
          }),
  });
}
