import { Suspense, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import type { BoardProps } from 'boardgame.io/react';
import { CheckersState } from '../game/types';
import { BoardScene } from '../scene/BoardScene';
import { GameUI } from './GameUI';
import { useSound } from '../hooks/useSound';
import type { GameMode } from './Lobby';
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

  const interactive =
    mode === 'local' ||
    (mode === 'ai' && ctx.currentPlayer === playerID) ||
    (mode === 'online' && ctx.currentPlayer === playerID);

  const handleSelect = useCallback(
    (row: number, col: number) => {
      if (!interactive || ctx.gameover) return;
      moves.selectSquare(row, col);
    },
    [interactive, ctx.gameover, moves],
  );

  return (
    <div className="game-board">
      <GameUI
        G={G}
        ctx={ctx}
        playerID={playerID}
        playerName={playerName}
        opponentName={opponentName}
        mode={mode}
        onLeave={onLeave}
      />
      <Canvas shadows camera={{ position: [0, 9, 9], fov: 45 }}>
        <Suspense fallback={null}>
          <BoardScene G={G} onSelectSquare={handleSelect} interactive={interactive} />
        </Suspense>
      </Canvas>
    </div>
  );
}
