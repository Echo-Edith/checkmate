"use client";

import { useState } from "react";
import type { PieceSymbol } from "chess.js";
import { pieceGlyph, pieceStyle } from "@/components/chess/pieces";

const PIECES: Array<{ type: PieceSymbol; name: string; points: string; moves: string }> = [
  { type: "k", name: "King", points: "Priceless", moves: "One square in any direction. Keep it safe!" },
  { type: "q", name: "Queen", points: "9 points", moves: "Any distance, straight or diagonal." },
  { type: "r", name: "Rook", points: "5 points", moves: "Any distance, straight lines only." },
  { type: "b", name: "Bishop", points: "3 points", moves: "Any distance, diagonal only." },
  { type: "n", name: "Knight", points: "3 points", moves: "An L shape. It can jump over pieces." },
  { type: "p", name: "Pawn", points: "1 point", moves: "Forward one square. Captures diagonally." },
];

/** A row of all six pieces with their names. Tap one to see how it moves. */
export function PieceLineup({ compact = false }: { compact?: boolean }) {
  const [selected, setSelected] = useState<PieceSymbol | null>(null);
  const info = PIECES.find((piece) => piece.type === selected);

  return (
    <div>
      <ul className="grid grid-cols-6 gap-1.5">
        {PIECES.map((piece, index) => {
          const active = selected === piece.type;
          return (
            <li key={piece.type}>
              <button
                type="button"
                onClick={() => setSelected(active ? null : piece.type)}
                aria-pressed={active}
                title={`${piece.name}: ${piece.moves}`}
                className="flex w-full flex-col items-center gap-1 rounded-lg border p-1"
                style={{ borderColor: active ? "var(--accent)" : "var(--border)", borderWidth: active ? 2 : 1 }}
              >
                <span
                  className={`flex aspect-square w-full items-center justify-center rounded-md leading-none ${compact ? "text-2xl" : "text-3xl sm:text-4xl"}`}
                  style={{ background: index % 2 === 0 ? "var(--sq-dark, #769656)" : "var(--sq-light, #eeeed2)", ...pieceStyle(index % 2 === 0 ? "w" : "b") }}
                >
                  {pieceGlyph(piece.type)}
                </span>
                <span className={`font-medium ${compact ? "text-[10px]" : "text-[11px] sm:text-xs"}`}>{piece.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {info && (
        <p className="mascot-panel mt-2 text-sm" role="status">
          <span className="font-semibold">{info.name}</span> · {info.points} — {info.moves}
        </p>
      )}
    </div>
  );
}
