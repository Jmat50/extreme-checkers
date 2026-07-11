import { useMemo, useRef } from 'react';
import { CheckersState, Move, PieceColor, Position } from '../game/types';
import { getHazardSquares } from '../game/logic';
import { useConfigStore } from '../config/configStore';
import { useExplosionBursts } from '../hooks/useExplosionBursts';
import { usePieceDrag } from '../hooks/usePieceDrag';
import { BoardSquare, type SquareHighlight } from './BoardSquare';
import { PieceSprite } from './PieceSprite';
import { BombMarker2d } from './BombMarker2d';
import { ExplosionSprite } from './ExplosionSprite';
import { pieceAsset } from './assetPaths2d';
import './Board2D.css';

interface Board2DProps {
  G: CheckersState;
  /** Client-side selection (overrides G.selected when provided). */
  selected?: Position | null;
  /** Client-side legal targets (overrides G.validMoves when provided). */
  validMoves?: Move[];
  onSelectSquare: (row: number, col: number) => void;
  onCommitMove?: (move: Move) => void;
  interactive: boolean;
  playerColor: PieceColor | null;
}

export function Board2D({
  G,
  selected: selectedProp,
  validMoves: validMovesProp,
  onSelectSquare,
  onCommitMove,
  interactive,
  playerColor,
}: Board2DProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const sceneConfig = useConfigStore((s) => s.config.scene);
  const editMode = useConfigStore((s) => s.editMode);
  const hazardSquares = useConfigStore((s) => s.config.rules.hazardSquares);
  const startRed = useConfigStore((s) => s.config.rules.startRed);
  const startBlack = useConfigStore((s) => s.config.rules.startBlack);

  const selected = selectedProp !== undefined ? selectedProp : G.selected;
  const moveList = validMovesProp ?? G.validMoves;

  const validTargets = useMemo(
    () => new Set(moveList.map((m: Move) => `${m.to.row},${m.to.col}`)),
    [moveList],
  );

  const { bursts, removeBurst } = useExplosionBursts(G.eliminationFlash, G.lastEliminations);

  const isEditing = editMode !== 'play';
  const boardInteractive = isEditing || interactive;

  const {
    drag,
    hover,
    canDragPiece,
    handlePiecePointerDown,
    handlePieceMouseDown,
    shouldSuppressSquareClick,
    isDraggingFrom,
  } = usePieceDrag({
    boardRef,
    board: G.board,
    mustContinueFrom: G.mustContinueFrom,
    playerColor: isEditing ? null : playerColor,
    interactive: boardInteractive && !isEditing,
    onSelectSquare,
    onCommitMove,
  });

  const dragValidTargets = drag?.validTargets ?? null;
  const dragFrom = drag?.from ?? null;

  const handleSquareSelect = (row: number, col: number) => {
    if (drag || shouldSuppressSquareClick()) return;
    onSelectSquare(row, col);
  };

  const hazardSet = useMemo(() => {
    const squares = editMode === 'play' ? getHazardSquares() : hazardSquares;
    return new Set(squares.map((p) => `${p.row},${p.col}`));
  }, [editMode, hazardSquares]);

  const startRedSet = useMemo(
    () => new Set(startRed.map((p) => `${p.row},${p.col}`)),
    [startRed],
  );
  const startBlackSet = useMemo(
    () => new Set(startBlack.map((p) => `${p.row},${p.col}`)),
    [startBlack],
  );

  function isSquareInteractive(row: number, col: number): boolean {
    if (!boardInteractive) return false;
    if (isEditing) return true;
    if (drag) return false;

    const key = `${row},${col}`;
    if (validTargets.has(key)) return true;

    const piece = G.board[row]?.[col];
    if (piece && playerColor && piece.color === playerColor) return true;

    return false;
  }

  function squareHighlight(row: number, col: number): SquareHighlight {
    const key = `${row},${col}`;
    if (
      drag?.active &&
      hover?.row === row &&
      hover?.col === col &&
      dragValidTargets?.has(key)
    ) {
      return 'drop-target';
    }
    if (editMode === 'bombs' && hazardSet.has(key)) return 'edit-bomb';
    if (editMode === 'startRed' && startRedSet.has(key)) return 'edit-red';
    if (editMode === 'startBlack' && startBlackSet.has(key)) return 'edit-black';
    if (
      !isEditing &&
      ((selected?.row === row && selected?.col === col) ||
        (dragFrom?.row === row && dragFrom?.col === col))
    ) {
      return 'selected';
    }
    if (
      !isEditing &&
      (validTargets.has(key) || dragValidTargets?.has(key))
    ) {
      return 'valid';
    }
    return 'none';
  }

  const squares = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      squares.push(
        <BoardSquare
          key={`sq-${row}-${col}`}
          row={row}
          col={col}
          highlight={squareHighlight(row, col)}
          highlightOpacity={sceneConfig.highlightOpacity}
          interactive={isSquareInteractive(row, col)}
          onSelect={handleSquareSelect}
        />,
      );
    }
  }

  const ghostCellSize =
    boardRef.current != null
      ? boardRef.current.getBoundingClientRect().width / 8
      : undefined;

  return (
    <>
      <div
        ref={boardRef}
        className={`board-2d${drag?.active ? ' board-2d--dragging' : ''}`}
        style={{ transform: `scale(${sceneConfig.boardScale})`, transformOrigin: 'center center' }}
      >
        {squares}

        {(editMode === 'play' ? getHazardSquares() : hazardSquares).map(({ row, col }) => (
          <BombMarker2d
            key={`bomb-${row}-${col}`}
            row={row}
            col={col}
            scale={sceneConfig.bombIconScale}
          />
        ))}

        {bursts.map((burst) => (
          <ExplosionSprite
            key={burst.id}
            row={burst.row}
            col={burst.col}
            size={sceneConfig.explosionSize}
            durationMs={sceneConfig.explosionDurationMs}
            frameCount={sceneConfig.explosionFrameCount}
            onComplete={() => removeBurst(burst.id)}
          />
        ))}

        {G.board.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null;
            const key = `${r},${c}`;
            const draggable = canDragPiece(r, c);
            return (
              <PieceSprite
                key={key}
                row={r}
                col={c}
                color={cell.color}
                king={cell.king}
                selected={
                  (selected?.row === r && selected?.col === c) ||
                  (dragFrom?.row === r && dragFrom?.col === c)
                }
                pieceSizeRatio={sceneConfig.pieceSizeRatio}
                draggable={draggable}
                isDragging={isDraggingFrom(r, c)}
                onPointerDown={
                  draggable
                    ? (e) => handlePiecePointerDown(r, c, e)
                    : undefined
                }
                onMouseDown={
                  draggable
                    ? (e) => handlePieceMouseDown(r, c, e)
                    : undefined
                }
                onClick={(e) => e.stopPropagation()}
              />
            );
          }),
        )}
      </div>

      {drag?.active && (
        <div
          className="piece-drag-ghost"
          style={{
            left: drag.ghostX,
            top: drag.ghostY,
            width: ghostCellSize
              ? ghostCellSize * sceneConfig.pieceSizeRatio
              : undefined,
            height: ghostCellSize
              ? ghostCellSize * sceneConfig.pieceSizeRatio
              : undefined,
          }}
          aria-hidden
        >
          <img
            src={pieceAsset(drag.piece.color, drag.piece.king)}
            alt=""
            draggable={false}
          />
        </div>
      )}
    </>
  );
}
