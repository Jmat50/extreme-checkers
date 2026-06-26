import { useMemo } from 'react';
import { CheckersState, Move } from '../game/types';
import { getHazardSquares } from '../game/logic';
import { useConfigStore } from '../config/configStore';
import { useExplosionBursts } from '../hooks/useExplosionBursts';
import { BoardSquare, type SquareHighlight } from './BoardSquare';
import { PieceSprite } from './PieceSprite';
import { BombMarker2d } from './BombMarker2d';
import { ExplosionSprite } from './ExplosionSprite';
import './Board2D.css';

interface Board2DProps {
  G: CheckersState;
  onSelectSquare: (row: number, col: number) => void;
  interactive: boolean;
}

export function Board2D({ G, onSelectSquare, interactive }: Board2DProps) {
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

  return (
    <div
      className="board-2d"
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
          return (
            <PieceSprite
              key={key}
              row={r}
              col={c}
              color={cell.color}
              king={cell.king}
              selected={G.selected?.row === r && G.selected?.col === c}
              pieceSizeRatio={sceneConfig.pieceSizeRatio}
            />
          );
        }),
      )}
    </div>
  );
}
