import { useCallback, useRef, useState } from 'react';
import type { Cell, Piece, PieceColor, Position } from '../game/types';
import { getValidMovesForSelection } from '../game/logic';

const DRAG_THRESHOLD_PX = 6;

export function clientToSquare(
  boardEl: HTMLElement,
  clientX: number,
  clientY: number,
): Position | null {
  const hit = document.elementFromPoint(clientX, clientY);
  const squareBtn = hit?.closest('button.board-square') as HTMLButtonElement | null;
  if (squareBtn) {
    const label = squareBtn.getAttribute('aria-label') ?? '';
    const match = label.match(/Square (\d+), (\d+)/);
    if (match) {
      return { row: Number(match[1]) - 1, col: Number(match[2]) - 1 };
    }
  }

  const rect = boardEl.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;
  if (relX < 0 || relY < 0 || relX >= rect.width || relY >= rect.height) return null;
  const col = Math.min(7, Math.floor((relX / rect.width) * 8));
  const row = Math.min(7, Math.floor((relY / rect.height) * 8));
  return { row, col };
}

interface DragVisual {
  from: Position;
  piece: Piece;
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

type DragPointerLike = {
  clientX: number;
  clientY: number;
  button: number;
  pointerId: number;
  currentTarget: EventTarget & HTMLElement;
  preventDefault: () => void;
  stopPropagation: () => void;
};

export function usePieceDrag({
  boardRef,
  board,
  mustContinueFrom,
  playerColor,
  interactive,
  onSelectSquare,
}: UsePieceDragOptions) {
  const [drag, setDrag] = useState<DragVisual | null>(null);
  const [hover, setHover] = useState<Position | null>(null);
  const onSelectRef = useRef(onSelectSquare);
  const activeDragPointerId = useRef<number | null>(null);
  const hoverRef = useRef<Position | null>(null);
  const wasActiveRef = useRef(false);
  onSelectRef.current = onSelectSquare;

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

  const beginDrag = useCallback(
    (row: number, col: number, e: DragPointerLike) => {
      if (!canDragPiece(row, col) || !playerColor) return;
      if (e.button !== 0) return;
      if (activeDragPointerId.current !== null) return;

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
      const from = { row, col };
      const origin = { x: e.clientX, y: e.clientY };
      const targetEl = e.currentTarget;
      let sessionOpen = true;

      onSelectRef.current(row, col);
      activeDragPointerId.current = e.pointerId;

      if (targetEl.setPointerCapture && 'pointerId' in e) {
        try {
          targetEl.setPointerCapture((e as DragPointerLike & { pointerId: number }).pointerId);
        } catch {
          // ignore
        }
      }

      const visual: DragVisual = {
        from,
        piece,
        ghostX: e.clientX,
        ghostY: e.clientY,
        active: false,
        validTargets,
      };
      setDrag(visual);
      setHover(from);
      hoverRef.current = from;
      wasActiveRef.current = false;

      const onMove = (ev: PointerEvent | MouseEvent) => {
        if (!sessionOpen) return;

        const dx = ev.clientX - origin.x;
        const dy = ev.clientY - origin.y;
        const active =
          wasActiveRef.current || Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX;
        if (active) wasActiveRef.current = true;

        const boardEl = boardRef.current;
        const hoverSquare = boardEl
          ? clientToSquare(boardEl, ev.clientX, ev.clientY)
          : null;

        setHover(hoverSquare);
        hoverRef.current = hoverSquare;
        setDrag((prev) =>
          prev
            ? {
                ...prev,
                ghostX: ev.clientX,
                ghostY: ev.clientY,
                active,
              }
            : null,
        );
      };

      const onFinish = (ev: PointerEvent | MouseEvent) => {
        if (!sessionOpen) return;
        sessionOpen = false;

        targetEl.removeEventListener('pointermove', onMove);
        targetEl.removeEventListener('pointerup', onFinish);
        targetEl.removeEventListener('pointercancel', onFinish);
        targetEl.removeEventListener('mousemove', onMove);
        targetEl.removeEventListener('mouseup', onFinish);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onFinish);
        activeDragPointerId.current = null;

        const active = wasActiveRef.current;

        const boardEl = boardRef.current;
        const drop =
          hoverRef.current ??
          (boardEl ? clientToSquare(boardEl, ev.clientX, ev.clientY) : null);

        if (
          active &&
          drop &&
          validTargets.has(`${drop.row},${drop.col}`)
        ) {
          onSelectRef.current(drop.row, drop.col);
        }

        setDrag(null);
        setHover(null);
        hoverRef.current = null;
        wasActiveRef.current = false;
      };

      targetEl.addEventListener('pointermove', onMove);
      targetEl.addEventListener('pointerup', onFinish);
      targetEl.addEventListener('pointercancel', onFinish);
      targetEl.addEventListener('mousemove', onMove);
      targetEl.addEventListener('mouseup', onFinish);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onFinish);
    },
    [board, boardRef, canDragPiece, mustContinueFrom, playerColor],
  );

  const handlePiecePointerDown = useCallback(
    (row: number, col: number, e: React.PointerEvent<HTMLDivElement>) => {
      beginDrag(row, col, e);
    },
    [beginDrag],
  );

  const handlePieceMouseDown = useCallback(
    (row: number, col: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      // Pointer events already handled this gesture in modern browsers.
      if (typeof PointerEvent !== 'undefined' && e.nativeEvent instanceof PointerEvent) {
        return;
      }
      beginDrag(row, col, {
        clientX: e.clientX,
        clientY: e.clientY,
        button: e.button,
        pointerId: 1,
        currentTarget: e.currentTarget,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
      });
    },
    [beginDrag],
  );

  return {
    drag,
    hover,
    canDragPiece,
    handlePiecePointerDown,
    handlePieceMouseDown,
    isDraggingFrom: (row: number, col: number) =>
      Boolean(
        drag?.active && drag.from.row === row && drag.from.col === col,
      ),
  };
}
