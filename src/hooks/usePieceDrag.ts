import { useCallback, useEffect, useRef, useState } from 'react';
import type { Cell, Move, Piece, PieceColor, Position } from '../game/types';
import { getValidMovesForSelection } from '../game/logic';

const DRAG_THRESHOLD_PX = 8;
const DROP_THRESHOLD_PX = 24;

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
  legalMoves: Move[];
}

interface UsePieceDragOptions {
  boardRef: React.RefObject<HTMLElement | null>;
  board: Cell[][];
  mustContinueFrom: Position | null;
  playerColor: PieceColor | null;
  interactive: boolean;
  onSelectSquare: (row: number, col: number) => void;
  /** Atomic commit for drag-drop (preferred for multiplayer). */
  onCommitMove?: (move: Move) => void;
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

type SessionHandlers = {
  onMove: (ev: PointerEvent | MouseEvent) => void;
  onFinish: (ev: PointerEvent | MouseEvent) => void;
  targetEl: HTMLElement;
  pointerId: number;
};

function sameSquare(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function eventPointerId(ev: PointerEvent | MouseEvent): number | null {
  return 'pointerId' in ev && typeof ev.pointerId === 'number' ? ev.pointerId : null;
}

export function usePieceDrag({
  boardRef,
  board,
  mustContinueFrom,
  playerColor,
  interactive,
  onSelectSquare,
  onCommitMove,
}: UsePieceDragOptions) {
  const [drag, setDrag] = useState<DragVisual | null>(null);
  const [hover, setHover] = useState<Position | null>(null);
  const onSelectRef = useRef(onSelectSquare);
  const onCommitRef = useRef(onCommitMove);
  const activeDragPointerId = useRef<number | null>(null);
  const hoverRef = useRef<Position | null>(null);
  const wasActiveRef = useRef(false);
  const suppressSquareClicksUntil = useRef(0);
  const sessionRef = useRef<SessionHandlers | null>(null);
  const abortSessionRef = useRef<() => void>(() => undefined);
  onSelectRef.current = onSelectSquare;
  onCommitRef.current = onCommitMove;

  const shouldSuppressSquareClick = useCallback(() => {
    return Date.now() < suppressSquareClicksUntil.current;
  }, []);

  const clearDragVisual = useCallback(() => {
    setDrag(null);
    setHover(null);
    hoverRef.current = null;
    wasActiveRef.current = false;
  }, []);

  const detachSessionListeners = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const { targetEl, onMove, onFinish } = session;
    targetEl.removeEventListener('pointermove', onMove);
    targetEl.removeEventListener('pointerup', onFinish);
    targetEl.removeEventListener('pointercancel', onFinish);
    targetEl.removeEventListener('lostpointercapture', onFinish);
    targetEl.removeEventListener('mousemove', onMove);
    targetEl.removeEventListener('mouseup', onFinish);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onFinish);
    window.removeEventListener('pointercancel', onFinish);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onFinish);
    sessionRef.current = null;
  }, []);

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

      // Reset any stuck prior session without depending on React state.
      if (activeDragPointerId.current !== null || sessionRef.current) {
        abortSessionRef.current();
      }

      e.preventDefault();
      e.stopPropagation();

      const piece = board[row][col]!;
      const legalMoves = getValidMovesForSelection(
        board,
        { row, col },
        playerColor,
        mustContinueFrom,
      );
      const validTargets = new Set(
        legalMoves.map((m) => `${m.to.row},${m.to.col}`),
      );
      const from = { row, col };
      const origin = { x: e.clientX, y: e.clientY };
      const targetEl = e.currentTarget;
      let sessionOpen = true;
      let maxDist = 0;
      let hoveredValidTarget = false;
      // Defer React drag state until movement passes the threshold so a
      // tap/click never disables every board square (softlock class).
      let visualArmed = false;

      activeDragPointerId.current = e.pointerId;

      if (targetEl.setPointerCapture && 'pointerId' in e) {
        try {
          targetEl.setPointerCapture(e.pointerId);
        } catch {
          // Window listeners still finish the session if capture fails.
        }
      }

      hoverRef.current = from;
      wasActiveRef.current = false;

      const armVisual = (ev: PointerEvent | MouseEvent, active: boolean) => {
        visualArmed = true;
        setHover(hoverRef.current);
        setDrag({
          from,
          piece,
          ghostX: ev.clientX,
          ghostY: ev.clientY,
          active,
          validTargets,
          legalMoves,
        });
      };

      const onMove = (ev: PointerEvent | MouseEvent) => {
        if (!sessionOpen) return;
        const pid = eventPointerId(ev);
        if (
          pid != null &&
          activeDragPointerId.current != null &&
          pid !== activeDragPointerId.current
        ) {
          return;
        }

        const dx = ev.clientX - origin.x;
        const dy = ev.clientY - origin.y;
        const dist = Math.hypot(dx, dy);
        maxDist = Math.max(maxDist, dist);
        const active = wasActiveRef.current || dist >= DRAG_THRESHOLD_PX;
        if (active) wasActiveRef.current = true;

        const boardEl = boardRef.current;
        const hoverSquare = boardEl
          ? clientToSquare(boardEl, ev.clientX, ev.clientY)
          : null;

        if (hoverSquare) {
          const hoverKey = `${hoverSquare.row},${hoverSquare.col}`;
          if (validTargets.has(hoverKey) && !sameSquare(hoverSquare, from)) {
            hoveredValidTarget = true;
          }
        }

        hoverRef.current = hoverSquare;

        if (!visualArmed && active) {
          armVisual(ev, true);
          return;
        }
        if (!visualArmed) return;

        setHover(hoverSquare);
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

      const endSessionShell = () => {
        sessionOpen = false;
        detachSessionListeners();
        activeDragPointerId.current = null;
        try {
          if (targetEl.hasPointerCapture?.(e.pointerId)) {
            targetEl.releasePointerCapture(e.pointerId);
          }
        } catch {
          // ignore
        }
      };

      const onFinish = (ev: PointerEvent | MouseEvent) => {
        if (!sessionOpen) return;
        const pid = eventPointerId(ev);
        // Accept mouseup (no pointerId) always; for pointer events require match
        // OR accept any pointerup if this session is the only one (recovery).
        if (
          pid != null &&
          activeDragPointerId.current != null &&
          pid !== activeDragPointerId.current
        ) {
          return;
        }

        endSessionShell();

        const boardEl = boardRef.current;
        const drop =
          hoverRef.current ??
          (boardEl ? clientToSquare(boardEl, ev.clientX, ev.clientY) : null);

        const dropKey = drop ? `${drop.row},${drop.col}` : null;
        const isValidDrop =
          maxDist >= DROP_THRESHOLD_PX &&
          hoveredValidTarget &&
          drop != null &&
          !sameSquare(drop, from) &&
          dropKey != null &&
          validTargets.has(dropKey);

        if (isValidDrop && drop) {
          suppressSquareClicksUntil.current = Date.now() + 400;
          const move = legalMoves.find(
            (m) => m.to.row === drop.row && m.to.col === drop.col,
          );
          if (move && onCommitRef.current) {
            onCommitRef.current(move);
          } else {
            onSelectRef.current(from.row, from.col);
            queueMicrotask(() => {
              onSelectRef.current(drop.row, drop.col);
            });
          }
        } else if (maxDist < DROP_THRESHOLD_PX) {
          onSelectRef.current(from.row, from.col);
        }

        clearDragVisual();
      };

      const abortSession = () => {
        if (!sessionOpen) {
          clearDragVisual();
          activeDragPointerId.current = null;
          detachSessionListeners();
          return;
        }
        endSessionShell();
        clearDragVisual();
      };
      abortSessionRef.current = abortSession;

      sessionRef.current = { onMove, onFinish, targetEl, pointerId: e.pointerId };

      targetEl.addEventListener('pointermove', onMove);
      targetEl.addEventListener('pointerup', onFinish);
      targetEl.addEventListener('pointercancel', onFinish);
      targetEl.addEventListener('lostpointercapture', onFinish);
      targetEl.addEventListener('mousemove', onMove);
      targetEl.addEventListener('mouseup', onFinish);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onFinish);
      window.addEventListener('pointercancel', onFinish);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onFinish);
    },
    [
      board,
      boardRef,
      canDragPiece,
      clearDragVisual,
      detachSessionListeners,
      mustContinueFrom,
      playerColor,
    ],
  );

  useEffect(() => {
    if (interactive) return;
    abortSessionRef.current();
  }, [interactive]);

  useEffect(() => {
    const onBlur = () => abortSessionRef.current();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') abortSessionRef.current();
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      abortSessionRef.current();
    };
  }, []);

  const handlePiecePointerDown = useCallback(
    (row: number, col: number, e: React.PointerEvent<HTMLDivElement>) => {
      beginDrag(row, col, e);
    },
    [beginDrag],
  );

  const handlePieceMouseDown = useCallback(
    (row: number, col: number, e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
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
    shouldSuppressSquareClick,
    isDraggingFrom: (row: number, col: number) =>
      Boolean(
        drag?.active && drag.from.row === row && drag.from.col === col,
      ),
  };
}
