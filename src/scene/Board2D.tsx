import { useMemo, useRef } from 'react';
import { CheckersState, Move, PieceColor } from '../game/types';
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
  onSelectSquare: (row: number, col: number) => void;
  interactive: boolean;
  playerColor: PieceColor | null;
}

export function Board2D({
  G,
  onSelectSquare,
  interactive,
  playerColor,
}: Board2DProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const sceneConfig = useConfigStore((s) => s.config.scene);
  const editMode = useConfigStore((s) => s.editMode);
  const hazardSquares = useConfigStore((s) => s.config.rules.hazardSquares);
  const startRed = useConfigStore((s) => s.config.rules.startRed);
  const startBlack = useConfigStore((s) => s.config.rules.startBlack);

  const validTargets = useMemo(
    () => new Set(G.validMoves.map((m: Move) => `${m.to.row},${m.to.col}`)),
    [G.validMoves],
  );

  const { bursts, removeBurst } = useExplosionBursts(G.eliminationFlash, G.lastEliminations);

  const isEditing = editMode !== 'play';
  const boardInteractive = isEditing || interactive;

  const {
    drag,
    hover,
    canDragPiece,
    handlePiecePointerDown,
    isDraggingFrom,
  } = usePieceDrag({
    boardRef,
    board: G.board,
    mustContinueFrom: G.mustContinueFrom,
    playerColor: isEditing ? null : playerColor,
    interactive: boardInteractive && !isEditing,
    onSelectSquare,
  });

  const dragValidTargets = drag?.validTargets ?? null;

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
    if (!isEditing && G.selected?.row === row && G.selected?.col === col) return 'selected';
    if (!isEditing && validTargets.has(key)) return 'valid';
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
          interactive={boardInteractive}
          onSelect={onSelectSquare}
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
                selected={G.selected?.row === r && G.selected?.col === c}
                pieceSizeRatio={sceneConfig.pieceSizeRatio}
                draggable={draggable}
                isDragging={isDraggingFrom(r, c)}
                onPointerDown={
                  draggable
                    ? (e) => handlePiecePointerDown(r, c, e)
                    : undefined
                }
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
