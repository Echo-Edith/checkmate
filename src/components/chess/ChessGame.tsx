"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { pieceGlyph, pieceStyle } from "@/components/chess/pieces";

interface PlayedMove {
  from: Square;
  to: Square;
  san: string;
}

type PromotionPiece = Extract<PieceSymbol, "q" | "r" | "b" | "n">;
const PROMOTION_PIECES: readonly PromotionPiece[] = ["q", "r", "b", "n"];

/** Rebuilds a game by replaying moves, so draw rules (repetition, 50-move) stay correct. */
function replay(moves: readonly PlayedMove[], count: number): Chess {
  const game = new Chess();
  for (const move of moves.slice(0, count)) {
    game.move(move.san);
  }
  return game;
}

interface GameStatus {
  over: boolean;
  text: string;
}

function getStatus(game: Chess): GameStatus {
  const side = game.turn() === "w" ? "White" : "Black";
  if (game.isCheckmate()) {
    return { over: true, text: `Checkmate — ${side === "White" ? "Black" : "White"} wins` };
  }
  if (game.isStalemate()) return { over: true, text: "Draw by stalemate" };
  if (game.isInsufficientMaterial()) return { over: true, text: "Draw — insufficient material" };
  if (game.isThreefoldRepetition()) return { over: true, text: "Draw by threefold repetition" };
  if (game.isDraw()) return { over: true, text: "Draw by the fifty-move rule" };
  if (game.isCheck()) return { over: false, text: `${side} to move — check` };
  return { over: false, text: `${side} to move` };
}

const buttonClass =
  "rounded-md border px-3 py-1.5 text-sm font-medium transition-opacity disabled:opacity-40";

export function ChessGame() {
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [orientation, setOrientation] = useState<Color>("w");
  const [pending, setPending] = useState<{ from: Square; to: Square } | null>(null);

  const game = useMemo(() => replay(moves, viewIndex), [moves, viewIndex]);
  const status = useMemo(() => getStatus(game), [game]);
  const isLatest = viewIndex === moves.length;
  const lastMove = viewIndex > 0 ? (moves[viewIndex - 1] ?? null) : null;

  const commitMove = useCallback(
    (from: Square, to: Square, promotion?: PromotionPiece) => {
      try {
        const next = replay(moves, moves.length);
        const made = next.move({ from, to, promotion });
        setMoves([...moves, { from: made.from, to: made.to, san: made.san }]);
        setViewIndex(moves.length + 1);
      } catch {
        // Illegal move: ignore. The board only offers legal moves, so this is a safety net.
      }
      setPending(null);
    },
    [moves],
  );

  const handleMove = useCallback(
    (from: Square, to: Square) => {
      const candidates = replay(moves, moves.length)
        .moves({ square: from, verbose: true })
        .filter((move) => move.to === to);
      if (candidates.length === 0) return;
      if (candidates.some((move) => move.promotion)) {
        setPending({ from, to });
        return;
      }
      commitMove(from, to);
    },
    [moves, commitMove],
  );

  function reset() {
    setMoves([]);
    setViewIndex(0);
    setPending(null);
  }

  // Keyboard navigation through the move history.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") setViewIndex((i) => Math.max(0, i - 1));
      else if (event.key === "ArrowRight") setViewIndex((i) => Math.min(moves.length, i + 1));
      else if (event.key === "Home") setViewIndex(0);
      else if (event.key === "End") setViewIndex(moves.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moves.length]);

  const interactive = isLatest && !status.over && pending === null;

  const rows: Array<{ number: number; white: PlayedMove | undefined; black: PlayedMove | undefined }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ number: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }

  function moveButton(move: PlayedMove | undefined, index: number) {
    if (!move) return <span />;
    const active = viewIndex === index + 1;
    return (
      <button
        type="button"
        onClick={() => setViewIndex(index + 1)}
        className="rounded px-2 py-0.5 text-left text-sm"
        style={{ background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "inherit" }}
      >
        {move.san}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="w-full max-w-[600px]">
        <ChessBoard
          game={game}
          orientation={orientation}
          interactive={interactive}
          lastMove={lastMove}
          onMove={handleMove}
        />
      </div>

      <aside className="w-full max-w-[600px] space-y-4 lg:w-72">
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border p-4 text-sm font-medium"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {status.text}
          {!isLatest && (
            <p className="mt-1 text-xs font-normal" style={{ color: "var(--muted)" }}>
              Viewing move {viewIndex} of {moves.length}. Go to the last move to keep playing.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} style={{ borderColor: "var(--border)" }} disabled={viewIndex === 0} onClick={() => setViewIndex(0)} aria-label="First move">
            «
          </button>
          <button type="button" className={buttonClass} style={{ borderColor: "var(--border)" }} disabled={viewIndex === 0} onClick={() => setViewIndex((i) => Math.max(0, i - 1))} aria-label="Previous move">
            ‹
          </button>
          <button type="button" className={buttonClass} style={{ borderColor: "var(--border)" }} disabled={isLatest} onClick={() => setViewIndex((i) => Math.min(moves.length, i + 1))} aria-label="Next move">
            ›
          </button>
          <button type="button" className={buttonClass} style={{ borderColor: "var(--border)" }} disabled={isLatest} onClick={() => setViewIndex(moves.length)} aria-label="Last move">
            »
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} style={{ borderColor: "var(--border)" }} onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>
            Flip board
          </button>
          <button type="button" className={buttonClass} style={{ borderColor: "var(--border)" }} disabled={moves.length === 0} onClick={reset}>
            New game
          </button>
        </div>

        <div
          className="max-h-72 overflow-y-auto rounded-lg border p-2"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {rows.length === 0 ? (
            <p className="p-2 text-sm" style={{ color: "var(--muted)" }}>
              Moves will appear here.
            </p>
          ) : (
            <div className="grid grid-cols-[2rem_1fr_1fr] items-center gap-y-0.5">
              {rows.map((row) => (
                <FragmentRow key={row.number} number={row.number}>
                  {moveButton(row.white, (row.number - 1) * 2)}
                  {moveButton(row.black, (row.number - 1) * 2 + 1)}
                </FragmentRow>
              ))}
            </div>
          )}
        </div>
      </aside>

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose promotion piece"
        >
          <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
            <p className="mb-3 text-sm font-medium">Promote pawn to</p>
            <div className="flex gap-2">
              {PROMOTION_PIECES.map((piece) => (
                <button
                  key={piece}
                  type="button"
                  onClick={() => commitMove(pending.from, pending.to, piece)}
                  className="flex h-16 w-16 items-center justify-center rounded-md border text-5xl leading-none"
                  style={{ borderColor: "var(--border)", background: "#769656", ...pieceStyle(game.turn()) }}
                  aria-label={`Promote to ${piece}`}
                >
                  {pieceGlyph(piece)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-md border px-3 text-sm"
                style={{ borderColor: "var(--border)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentRow({ number, children }: { number: number; children: ReactNode }) {
  return (
    <>
      <span className="pl-1 text-xs" style={{ color: "var(--muted)" }}>
        {number}.
      </span>
      {children}
    </>
  );
}
