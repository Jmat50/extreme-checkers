import { useCallback, useEffect, useRef, useState } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import { CheckersState, Move, Position } from '../game/types';
import { Board2D } from '../scene/Board2D';
import { GameUI } from './GameUI';
import { useSound } from '../hooks/useSound';
import type { GameMode } from './Lobby';
import { IS_EDITOR } from '../config/editorMode';
import { useConfigStore } from '../config/configStore';
import { getValidMovesForSelection, isDarkSquare } from '../game/logic';
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
  isActive,
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

  // Selection is client-only (boardgame.io multiplayer guidance): only commit
  // atomic playMove to the master. Two-step selectSquare races on SocketIO.
  const [selected, setSelected] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);

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

  useEffect(() => {
    setSelected(null);
    setValidMoves([]);
  }, [ctx.currentPlayer, ctx.gameover]);

  useEffect(() => {
    if (!G.mustContinueFrom) return;
    setSelected(G.mustContinueFrom);
    setValidMoves(G.validMoves);
  }, [G.mustContinueFrom, G.validMoves]);

  const playInteractive =
    mode === 'local' ||
    (mode === 'ai' && (isActive || ctx.currentPlayer === playerID)) ||
    (mode === 'online' && (isActive || ctx.currentPlayer === playerID));

  const interactive = IS_EDITOR ? editMode === 'play' && playInteractive : playInteractive;

  const playerColor =
    interactive && !ctx.gameover
      ? (PLAYER_COLORS[ctx.currentPlayer] ?? null)
      : null;

  const commitMove = useCallback(
    (move: Move) => {
      if (!interactive || ctx.gameover) return;
      moves.playMove(move);
      setSelected(null);
      setValidMoves([]);
    },
    [interactive, ctx.gameover, moves],
  );

  const handleSelect = useCallback(
    (row: number, col: number) => {
      if (IS_EDITOR && editMode !== 'play') {
        if (!isDarkSquare(row, col)) return;
        if (editMode === 'bombs') toggleHazard(row, col);
        else if (editMode === 'startRed') toggleStartRed(row, col);
        else if (editMode === 'startBlack') toggleStartBlack(row, col);
        return;
      }
      if (!interactive || ctx.gameover || !playerColor) return;

      const pos = { row, col };

      if (selected) {
        const chosen = validMoves.find(
          (m) => m.to.row === row && m.to.col === col,
        );
        if (chosen) {
          commitMove(chosen);
          return;
        }
      }

      // Mid multi-jump the chain piece is locked in; ignore other clicks so
      // the forced continuation selection is never lost.
      if (G.mustContinueFrom) return;

      const piece = G.board[row]?.[col];
      if (piece && piece.color === playerColor) {
        const filtered = getValidMovesForSelection(
          G.board,
          pos,
          playerColor,
          G.mustContinueFrom,
        );
        if (filtered.length === 0) {
          setSelected(null);
          setValidMoves([]);
          return;
        }
        setSelected(pos);
        setValidMoves(filtered);
        return;
      }

      setSelected(null);
      setValidMoves([]);
    },
    [
      editMode,
      toggleHazard,
      toggleStartRed,
      toggleStartBlack,
      interactive,
      ctx.gameover,
      playerColor,
      selected,
      validMoves,
      G.board,
      G.mustContinueFrom,
      commitMove,
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
          selected={selected}
          validMoves={validMoves}
          onSelectSquare={handleSelect}
          onCommitMove={commitMove}
          interactive={interactive}
          playerColor={playerColor}
        />
      </div>
    </div>
  );
}
