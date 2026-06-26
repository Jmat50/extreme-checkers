import { useCallback, useEffect, useRef, useState } from 'react';
import type { Cell, Piece, PieceColor, Position } from '../game/types';
import { getValidMovesForSelection } from '../game/logic';

const DRAG_THRESHOLD_PX = 6;

export function clientToSquare(
  boardEl: HTMLElement,
  clientX: number,
  clientY: number,
): Position | null {
  const rect = boardEl.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;
  if (relX < 0 || relY < 0 || relX >= rect.width || relY >= rect.height) return null;
  const col = Math.min(7, Math.floor((relX / rect.width) * 8));
  const row = Math.min(7, Math.floor((relY / rect.height) * 8));
  return { row, col };
}

interface DragSession {
  from: Position;
  piece: Piece;
  pointerId: number;
  ghostX: number;
  ghostY: number;
  active: boolean;
  validTargets: Set<string>;
}

interface UsePieceDragOptions {
  boardRef: React.RefObject<HTMLElement | null>;
  board: Cell[][];
  mustContinueFrom: Position | null;
  playerColor: PieceColor | null;
  interactive: boolean;
  onSelectSquare: (row: number, col: number) => void;
}

export function usePieceDrag({
  boardRef,
  board,
  mustContinueFrom,
  playerColor,
  interactive,
  onSelectSquare,
}: UsePieceDragOptions) {
  const [drag, setDrag] = useState<DragSession | null>(null);
  const [hover, setHover] = useState<Position | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  dragRef.current = drag;

  const canDragPiece = useCallback(
    (row: number, col: number): boolean => {
      if (!interactive || !playerColor) return false;
      const piece = board[row]?.[col];
      if (!piece || piece.color !== playerColor) return false;
      if (
        mustContinueFrom &&
        (mustContinueFrom.row !== row || mustContinueFrom.col !== col)
      ) {
        return false;
      }
      return (
        getValidMovesForSelection(board, { row, col }, playerColor, mustContinueFrom)
          .length > 0
      );
    },
    [board, interactive, mustContinueFrom, playerColor],
  );

  const handlePiecePointerDown = useCallback(
    (row: number, col: number, e: React.PointerEvent) => {
      if (!canDragPiece(row, col) || !playerColor) return;
      e.preventDefault();
      e.stopPropagation();

      const piece = board[row][col]!;
      const validMoves = getValidMovesForSelection(
        board,
        { row, col },
        playerColor,
        mustContinueFrom,
      );
      const validTargets = new Set(
        validMoves.map((m) => `${m.to.row},${m.to.col}`),
      );

      onSelectSquare(row, col);
      originRef.current = { x: e.clientX, y: e.clientY };

      const session: DragSession = {
        from: { row, col },
        piece,
        pointerId: e.pointerId,
        ghostX: e.clientX,
        ghostY: e.clientY,
        active: false,
        validTargets,
      };
      setDrag(session);
      setHover({ row, col });
    },
    [board, canDragPiece, mustContinueFrom, onSelectSquare, playerColor],
  );

  useEffect(() => {
    if (!drag) return;

    const pointerId = drag.pointerId;

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const session = dragRef.current;
      if (!session || !originRef.current) return;

      const dx = e.clientX - originRef.current.x;
      const dy = e.clientY - originRef.current.y;
      const active =
        session.active || Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;

      const boardEl = boardRef.current;
      const hoverSquare = boardEl
        ? clientToSquare(boardEl, e.clientX, e.clientY)
        : null;

      setHover(hoverSquare);
      setDrag({
        ...session,
        ghostX: e.clientX,
        ghostY: e.clientY,
        active,
      });
    };

    const finish = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      const session = dragRef.current;
      if (!session) return;

      const boardEl = boardRef.current;
      const target = boardEl
        ? clientToSquare(boardEl, e.clientX, e.clientY)
        : null;

      if (
        session.active &&
        target &&
        session.validTargets.has(`${target.row},${target.col}`)
      ) {
        onSelectSquare(target.row, target.col);
      }

      setDrag(null);
      setHover(null);
      originRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [boardRef, drag, onSelectSquare]);

  return {
    drag,
    hover,
    canDragPiece,
    handlePiecePointerDown,
    isDraggingFrom: (row: number, col: number) =>
      Boolean(
        drag?.active &&
          drag.from.row === row &&
          drag.from.col === col,
      ),
  };
}
