"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Chess, Color, Square } from "chess.js";
import { pieceGlyph, pieceStyle } from "@/components/chess/pieces";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

const LIGHT = "#eeeed2";
const DARK = "#769656";

export interface BoardMove {
  from: Square;
  to: Square;
}

interface ChessBoardProps {
  /** Position to display. Must not be mutated by the board. */
  game: Chess;
  orientation: Color;
  /** When false the board is view-only (history view, game over, promotion pending). */
  interactive: boolean;
  lastMove: BoardMove | null;
  onMove: (from: Square, to: Square) => void;
}

interface DragState {
  from: Square;
  size: number;
}

export function ChessBoard({ game, orientation, interactive, lastMove, onMove }: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const wasSelectedRef = useRef(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  const fen = game.fen();
  const turn = game.turn();

  // Clear selection whenever the position changes.
  useEffect(() => {
    setSelected(null);
    setDrag(null);
  }, [fen]);

  // Legal targets for the selected piece: target square -> is capture.
  const legalTargets = useMemo(() => {
    const targets = new Map<Square, boolean>();
    if (!selected) return targets;
    for (const move of game.moves({ square: selected, verbose: true })) {
      targets.set(move.to, move.flags.includes("c") || move.flags.includes("e"));
    }
    return targets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, fen]);

  // Square of the king that is in check, if any.
  const checkSquare = useMemo<Square | null>(() => {
    if (!game.isCheck()) return null;
    for (const file of FILES) {
      for (const rank of RANKS) {
        const square = `${file}${rank}` as Square;
        const piece = game.get(square);
        if (piece && piece.type === "k" && piece.color === turn) return square;
      }
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  // Drag-and-drop using window listeners so it works for mouse, touch and pen.
  useEffect(() => {
    if (!drag) return;
    const from = drag.from;

    const handleMove = (event: PointerEvent) => {
      setDragPos({ x: event.clientX, y: event.clientY });
    };
    const handleUp = (event: PointerEvent) => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const target = element?.closest<HTMLElement>("[data-square]")?.dataset.square as Square | undefined;
      setDrag(null);
      if (target && target !== from && legalTargets.has(target)) {
        setSelected(null);
        onMove(from, target);
      } else if (target === from && wasSelectedRef.current) {
        // Tapping an already selected piece deselects it.
        setSelected(null);
      }
    };
    const handleCancel = () => setDrag(null);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleCancel);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [drag, legalTargets, onMove]);

  function handlePointerDown(square: Square, event: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive) return;

    // Click-to-move: a legal target while a piece is selected.
    if (selected && legalTargets.has(square)) {
      setSelected(null);
      onMove(selected, square);
      return;
    }

    const piece = game.get(square);
    if (piece && piece.color === turn) {
      wasSelectedRef.current = selected === square;
      setSelected(square);
      const rect = boardRef.current?.getBoundingClientRect();
      setDrag({ from: square, size: rect ? rect.width / 8 : 48 });
      setDragPos({ x: event.clientX, y: event.clientY });
    } else {
      setSelected(null);
    }
  }

  const files = orientation === "w" ? [...FILES] : [...FILES].reverse();
  const ranks = orientation === "w" ? [...RANKS].reverse() : [...RANKS];
  const draggedPiece = drag ? game.get(drag.from) : undefined;

  return (
    <>
      <div
        ref={boardRef}
        className="relative grid w-full max-w-[600px] select-none grid-cols-8 overflow-hidden rounded-md border"
        style={{
          borderColor: "var(--border)",
          containerType: "inline-size",
          touchAction: "none",
          aspectRatio: "1 / 1",
        }}
        role="grid"
        aria-label="Chessboard"
      >
        {ranks.map((rank, rowIndex) =>
          files.map((file, colIndex) => {
            const square = `${file}${rank}` as Square;
            const isDark = (FILES.indexOf(file) + Number(rank)) % 2 === 1;
            const piece = game.get(square);
            const isSelected = selected === square;
            const isLast = lastMove !== null && (lastMove.from === square || lastMove.to === square);
            const isTarget = legalTargets.has(square);
            const isCapture = legalTargets.get(square) === true;
            const isDragSource = drag?.from === square;

            return (
              <div
                key={square}
                data-square={square}
                role="gridcell"
                aria-label={piece ? `${square} ${piece.color === "w" ? "white" : "black"} ${piece.type}` : square}
                onPointerDown={(event) => handlePointerDown(square, event)}
                className="relative flex items-center justify-center"
                style={{
                  background: isDark ? DARK : LIGHT,
                  cursor: interactive ? "pointer" : "default",
                }}
              >
                {isLast && <div className="absolute inset-0" style={{ background: "rgba(255, 221, 0, 0.35)" }} />}
                {isSelected && <div className="absolute inset-0" style={{ background: "rgba(20, 120, 255, 0.4)" }} />}
                {checkSquare === square && (
                  <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(circle, rgba(220,38,38,0.85) 0%, rgba(220,38,38,0) 70%)" }}
                  />
                )}

                {colIndex === 0 && (
                  <span
                    className="absolute left-0.5 top-0 text-[10px] font-semibold leading-tight"
                    style={{ color: isDark ? LIGHT : DARK }}
                  >
                    {rank}
                  </span>
                )}
                {rowIndex === 7 && (
                  <span
                    className="absolute bottom-0 right-0.5 text-[10px] font-semibold leading-tight"
                    style={{ color: isDark ? LIGHT : DARK }}
                  >
                    {file}
                  </span>
                )}

                {piece && (
                  <span
                    className="relative leading-none"
                    style={{
                      fontSize: "9.5cqw",
                      opacity: isDragSource ? 0.3 : 1,
                      ...pieceStyle(piece.color),
                    }}
                  >
                    {pieceGlyph(piece.type)}
                  </span>
                )}

                {isTarget && !isCapture && (
                  <div className="absolute h-[28%] w-[28%] rounded-full" style={{ background: "rgba(0,0,0,0.22)" }} />
                )}
                {isTarget && isCapture && (
                  <div
                    className="absolute inset-[4%] rounded-full"
                    style={{ border: "0.6cqw solid rgba(0,0,0,0.25)" }}
                  />
                )}
              </div>
            );
          }),
        )}
      </div>

      {drag && draggedPiece && (
        <span
          aria-hidden
          className="pointer-events-none fixed z-50 flex items-center justify-center leading-none"
          style={{
            left: dragPos.x - drag.size / 2,
            top: dragPos.y - drag.size / 2,
            width: drag.size,
            height: drag.size,
            fontSize: drag.size * 0.78,
            ...pieceStyle(draggedPiece.color),
          }}
        >
          {pieceGlyph(draggedPiece.type)}
        </span>
      )}
    </>
  );
}
