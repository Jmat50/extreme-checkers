import type { CSSProperties } from 'react';
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
}

export function PieceSprite({
  row,
  col,
  color,
  king,
  selected,
  pieceSizeRatio,
}: PieceSpriteProps) {
  return (
    <div
      className={`piece-sprite${selected ? ' piece-sprite--selected' : ''}`}
      style={{
        gridArea: `${row + 1} / ${col + 1}`,
        '--piece-scale': pieceSizeRatio,
      } as CSSProperties}
    >
      <img src={pieceAsset(color, king)} alt="" draggable={false} />
    </div>
  );
}
