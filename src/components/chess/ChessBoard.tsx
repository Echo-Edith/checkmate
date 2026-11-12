"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Chess, Color, Square } from "chess.js";
import { pieceGlyph, pieceStyle } from "@/components/chess/pieces";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

const LIGHT = "var(--sq-light, #eeeed2)";
const DARK = "var(--sq-dark, #769656)";

const SLIDE_MS = 220;

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
  /** Slide pieces to their new squares when the position changes (default true). */
  animate?: boolean;
  /** A suggested move, drawn as an arrow. */
  hint?: BoardMove | null;
  /** Tutor help: tint every square the selected piece can go to. */
  showTargets?: boolean;
  /** Tutor help: the best square for the selected piece. */
  bestTarget?: Square | null;
  /** Tells the parent which piece is selected. */
  onSelectChange?: (square: Square | null) => void;
}

interface DragState {
  from: Square;
  size: number;
}

export function ChessBoard({ game, orientation, interactive, lastMove, onMove, animate = true, hint = null, showTargets = false, bestTarget = null, onSelectChange }: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const wasSelectedRef = useRef(false);
  const prevCountRef = useRef(32);
  const mountedRef = useRef(false);
  const prevFenRef = useRef<string | null>(null);
  const skipAnimationRef = useRef(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  const fen = game.fen();
  const turn = game.turn();

  // Display position of a square (0-7 from the top-left), depending on the board orientation.
  function columnOf(square: Square): number {
    const index = FILES.indexOf(square[0] as (typeof FILES)[number]);
    return orientation === "w" ? index : 7 - index;
  }
  function rowOf(square: Square): number {
    const rank = Number(square[1]);
    return orientation === "w" ? 8 - rank : rank - 1;
  }

  // Clear selection whenever the position changes.
  useEffect(() => {
    setSelected(null);
    setDrag(null);
  }, [fen]);

  // Slide the moved piece (and the rook when castling) from its old square to the new one.
  useLayoutEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevFenRef.current = fen;
      prevCountRef.current = game.board().flat().filter(Boolean).length;
      return;
    }
    if (prevFenRef.current === fen) return;
    prevFenRef.current = fen;
    const count = game.board().flat().filter(Boolean).length;
    const wasCapture = prevCountRef.current > count;
    prevCountRef.current = count;

    if (skipAnimationRef.current) {
      skipAnimationRef.current = false;
      return;
    }
    const board = boardRef.current;
    if (!animate || !lastMove || !board) return;

    const size = board.getBoundingClientRect().width / 8;

    const slide = (from: Square, to: Square) => {
      const piece = board.querySelector<HTMLElement>(`[data-square="${to}"] [data-piece]`);
      if (!piece || typeof piece.animate !== "function") return;
      const dx = (columnOf(from) - columnOf(to)) * size;
      const dy = (rowOf(from) - rowOf(to)) * size;
      piece.style.zIndex = "20";
      const animation = piece.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(1)`, offset: 0 },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5}px) scale(1.28)`, offset: 0.45 },
          { transform: "translate(0px, 0px) scale(1.12)", offset: 0.8 },
          { transform: "translate(0px, 0px) scale(0.94, 1.06)", offset: 0.9 },
          { transform: "translate(0px, 0px) scale(1)", offset: 1 },
        ],
        { duration: SLIDE_MS + 130, easing: "cubic-bezier(0.25, 0.8, 0.3, 1)" },
      );
      // A ring that grows from the landing square.
      const square = piece.parentElement;
      if (square && typeof square.animate === "function") {
        const ring = document.createElement("div");
        ring.style.cssText = `position:absolute;inset:0;border-radius:${wasCapture ? "50%" : "12%"};pointer-events:none;z-index:15;border:0.6cqw solid ${wasCapture ? "rgba(239,68,68,0.9)" : "rgba(255,255,255,0.85)"};`;
        square.appendChild(ring);
        const burst = ring.animate(
          [
            { transform: "scale(0.4)", opacity: 0.95 },
            { transform: wasCapture ? "scale(1.7)" : "scale(1.3)", opacity: 0 },
          ],
          { duration: wasCapture ? 520 : 380, delay: SLIDE_MS * 0.6, easing: "ease-out", fill: "both" },
        );
        burst.onfinish = () => ring.remove();
      }
      if (wasCapture) {
        piece.animate([{ filter: "brightness(1.8)" }, { filter: "brightness(1)" }], { duration: 400, delay: SLIDE_MS * 0.6 });
      }
      animation.onfinish = () => {
        piece.style.zIndex = "";
      };
    };

    slide(lastMove.from, lastMove.to);

    // Castling: the king moves two files, so also slide the rook.
    const moved = game.get(lastMove.to);
    const fileDistance = Math.abs(
      FILES.indexOf(lastMove.from[0] as (typeof FILES)[number]) - FILES.indexOf(lastMove.to[0] as (typeof FILES)[number]),
    );
    if (moved?.type === "k" && fileDistance === 2) {
      const rank = lastMove.to[1];
      if (lastMove.to[0] === "g") slide(`h${rank}` as Square, `f${rank}` as Square);
      else if (lastMove.to[0] === "c") slide(`a${rank}` as Square, `d${rank}` as Square);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen]);

  useEffect(() => {
    onSelectChange?.(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

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
        // The piece was already carried to the square by the drag, so do not slide it again.
        skipAnimationRef.current = true;
        window.setTimeout(() => {
          skipAnimationRef.current = false;
        }, 1500);
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

  // Arrow for the suggested move, in a 0-8 coordinate space that matches the board.
  const arrow = useMemo(() => {
    if (!hint) return null;
    const x1 = columnOf(hint.from) + 0.5;
    const y1 = rowOf(hint.from) + 0.5;
    const x2 = columnOf(hint.to) + 0.5;
    const y2 = rowOf(hint.to) + 0.5;
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length === 0) return null;
    const ux = (x2 - x1) / length;
    const uy = (y2 - y1) / length;
    const headLength = 0.42;
    const headHalfWidth = 0.24;
    const tipX = x2 - ux * 0.08;
    const tipY = y2 - uy * 0.08;
    const baseX = tipX - ux * headLength;
    const baseY = tipY - uy * headLength;
    const points = [
      `${tipX},${tipY}`,
      `${baseX - uy * headHalfWidth},${baseY + ux * headHalfWidth}`,
      `${baseX + uy * headHalfWidth},${baseY - ux * headHalfWidth}`,
    ].join(" ");
    return { x1: x1 + ux * 0.15, y1: y1 + uy * 0.15, x2: baseX + ux * 0.05, y2: baseY + uy * 0.05, points };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hint, orientation]);

  return (
    <>
      <div
        ref={boardRef}
        className="relative grid w-full select-none overflow-hidden rounded-md border"
        style={{
          borderColor: "var(--border)",
          containerType: "inline-size",
          touchAction: "none",
          aspectRatio: "1 / 1",
          // Fixed equal tracks: empty rows and columns must never collapse.
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
          gridTemplateRows: "repeat(8, minmax(0, 1fr))",
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
            const isHint = hint !== null && (hint.from === square || hint.to === square);

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
                {isHint && (
                  <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 0 0.7cqw rgba(34, 197, 94, 0.95)" }} />
                )}
                {showTargets && isTarget && (
                  <div className="absolute inset-0" style={{ background: "rgba(34, 197, 94, 0.28)" }} />
                )}
                {isTarget && bestTarget === square && (
                  <>
                    <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 0 0.8cqw rgba(250, 204, 21, 0.98)", background: "rgba(250, 204, 21, 0.3)" }} />
                    <span className="absolute right-0.5 top-0 text-[3cqw] leading-none" style={{ color: "#facc15", textShadow: "0 0 3px #000" }} aria-label="best square">
                      ★
                    </span>
                  </>
                )}
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
                    data-piece
                    className="relative leading-none"
                    style={{
                      fontSize: "9.5cqw",
                      opacity: isDragSource ? 0.3 : 1,
                      transform: isSelected && !drag ? "translateY(-6%) scale(1.14)" : "none",
                      transition: "transform 140ms ease-out, filter 140ms",
                      filter: isSelected && !drag ? "drop-shadow(0 4px 3px rgba(0,0,0,0.45))" : "none",
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

        {arrow && (
          <svg viewBox="0 0 8 8" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <line
              x1={arrow.x1}
              y1={arrow.y1}
              x2={arrow.x2}
              y2={arrow.y2}
              stroke="rgba(34, 197, 94, 0.88)"
              strokeWidth="0.17"
              strokeLinecap="round"
            />
            <polygon points={arrow.points} fill="rgba(34, 197, 94, 0.88)" />
          </svg>
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
