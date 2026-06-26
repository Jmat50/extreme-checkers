import type { CSSProperties, PointerEvent } from 'react';
import { pieceAsset } from './assetPaths2d';
import type { PieceColor } from '../game/types';
import './Board2D.css';

interface PieceSpriteProps {
  row: number;
  col: number;
  color: PieceColor;
  king: boolean;
  selected: boolean;
  pieceSizeRatio: number;
  draggable?: boolean;
  isDragging?: boolean;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function PieceSprite({
  row,
  col,
  color,
  king,
  selected,
  pieceSizeRatio,
  draggable = false,
  isDragging = false,
  onPointerDown,
  onMouseDown,
}: PieceSpriteProps) {
  return (
    <div
      className={[
        'piece-sprite',
        selected ? 'piece-sprite--selected' : '',
        draggable ? 'piece-sprite--draggable' : '',
        isDragging ? 'piece-sprite--dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        gridArea: `${row + 1} / ${col + 1}`,
        '--piece-scale': pieceSizeRatio,
      } as CSSProperties}
      onPointerDown={onPointerDown}
      onMouseDown={onMouseDown}
    >
      <img src={pieceAsset(color, king)} alt="" draggable={false} />
    </div>
  );
}
