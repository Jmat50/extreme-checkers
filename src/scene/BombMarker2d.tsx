import type { CSSProperties } from 'react';
import { ASSETS_2D } from './assetPaths2d';
import './Board2D.css';

interface BombMarker2dProps {
  row: number;
  col: number;
  scale: number;
}

export function BombMarker2d({ row, col, scale }: BombMarker2dProps) {
  return (
    <div
      className="bomb-marker"
      style={{
        gridArea: `${row + 1} / ${col + 1}`,
        '--bomb-scale': scale,
      } as CSSProperties}
    >
      <img src={ASSETS_2D.icons.bomb} alt="Bomb hazard" draggable={false} />
    </div>
  );
}
