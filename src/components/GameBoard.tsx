import { useCallback, useEffect, useRef } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import { CheckersState } from '../game/types';
import { Board2D } from '../scene/Board2D';
import { GameUI } from './GameUI';
import { useSound } from '../hooks/useSound';
import type { GameMode } from './Lobby';
import { IS_EDITOR } from '../config/editorMode';
import { useConfigStore } from '../config/configStore';
import { isDarkSquare } from '../game/logic';
import { PLAYER_COLORS } from '../game/game';
import './GameBoard.css';

interface GameBoardProps extends BoardProps<CheckersState> {
  mode: GameMode;
  playerName: string;
  opponentName: string;
  onLeave: () => void;
}

export function GameBoard({
  G,
  ctx,
  playerID,
  moves,
  mode,
  playerName,
  opponentName,
  onLeave,
}: GameBoardProps) {
  const { playMove, playCapture, playKing, playWin } = useSound();
  const lastMoveRef = useRef(G.lastMove);
  const editMode = useConfigStore((s) => s.editMode);
  const toggleHazard = useConfigStore((s) => s.toggleHazard);
  const toggleStartRed = useConfigStore((s) => s.toggleStartRed);
  const toggleStartBlack = useConfigStore((s) => s.toggleStartBlack);

  useEffect(() => {
    if (G.lastMove === lastMoveRef.current) return;
    const prev = lastMoveRef.current;
    lastMoveRef.current = G.lastMove;
    if (!G.lastMove) return;
    if (G.lastMove.captures?.length) playCapture();
    else playMove();
    const piece = G.board[G.lastMove.to.row]?.[G.lastMove.to.col];
    if (piece?.king && !prev) playKing();
  }, [G.lastMove, G.board, playCapture, playKing, playMove]);

  useEffect(() => {
    if (ctx.gameover?.winner || G.winner) playWin();
  }, [ctx.gameover, G.winner, playWin]);

  const playInteractive =
    mode === 'local' ||
    (mode === 'ai' && ctx.currentPlayer === playerID) ||
    (mode === 'online' && ctx.currentPlayer === playerID);

  const interactive = IS_EDITOR ? editMode === 'play' && playInteractive : playInteractive;

  const playerColor =
    interactive && !ctx.gameover
      ? (PLAYER_COLORS[ctx.currentPlayer] ?? null)
      : null;

  const handleSelect = useCallback(
    (row: number, col: number) => {
      if (IS_EDITOR && editMode !== 'play') {
        if (!isDarkSquare(row, col)) return;
        if (editMode === 'bombs') toggleHazard(row, col);
        else if (editMode === 'startRed') toggleStartRed(row, col);
        else if (editMode === 'startBlack') toggleStartBlack(row, col);
        return;
      }
      if (!interactive || ctx.gameover) return;
      moves.selectSquare(row, col);
    },
    [
      editMode,
      toggleHazard,
      toggleStartRed,
      toggleStartBlack,
      interactive,
      ctx.gameover,
      moves,
    ],
  );

  return (
    <div className="game-board">
      {!IS_EDITOR && (
        <GameUI
          G={G}
          ctx={ctx}
          playerID={playerID}
          playerName={playerName}
          opponentName={opponentName}
          mode={mode}
          onLeave={onLeave}
        />
      )}
      <div className="board-2d-wrapper">
        <Board2D
          G={G}
          onSelectSquare={handleSelect}
          interactive={interactive}
          playerColor={playerColor}
        />
      </div>
    </div>
  );
}
