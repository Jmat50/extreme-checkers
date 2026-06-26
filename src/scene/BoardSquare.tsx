import { ASSETS_2D } from './assetPaths2d';
import { isDarkSquare } from '../game/logic';
import './Board2D.css';

export type SquareHighlight = 'none' | 'selected' | 'valid' | 'edit-bomb' | 'edit-red' | 'edit-black';

interface BoardSquareProps {
  row: number;
  col: number;
  highlight: SquareHighlight;
  highlightOpacity: number;
  interactive: boolean;
  onSelect: (row: number, col: number) => void;
}

const HIGHLIGHT_COLORS: Record<SquareHighlight, string | null> = {
  none: null,
  selected: '#ffcc00',
  valid: '#44ff88',
  'edit-bomb': '#ff4444',
  'edit-red': '#ff6666',
  'edit-black': '#888888',
};

export function BoardSquare({
  row,
  col,
  highlight,
  highlightOpacity,
  interactive,
  onSelect,
}: BoardSquareProps) {
  const dark = isDarkSquare(row, col);
  const overlayColor = HIGHLIGHT_COLORS[highlight];

  return (
    <button
      type="button"
      className={`board-square ${dark ? 'board-square--dark' : 'board-square--light'}${interactive ? '' : ' board-square--disabled'}`}
      style={{ gridArea: `${row + 1} / ${col + 1}` }}
      onClick={() => onSelect(row, col)}
      disabled={!interactive}
      aria-label={`Square ${row + 1}, ${col + 1}`}
    >
      <img
        className="board-square__tile"
        src={dark ? ASSETS_2D.board.dark : ASSETS_2D.board.light}
        alt=""
        draggable={false}
      />
      {overlayColor && (
        <span
          className="board-square__highlight"
          style={{ backgroundColor: overlayColor, opacity: highlightOpacity }}
        />
      )}
    </button>
  );
}
