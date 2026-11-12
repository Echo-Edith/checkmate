import type { CSSProperties } from "react";
import type { Color, PieceSymbol } from "chess.js";
import { PIECE_SET_IDS, type PieceSetId } from "@/lib/themes";

// ︎ forces text presentation so the pawn is not rendered as an emoji.
const GLYPHS: Record<PieceSymbol, string> = {
  k: "♚︎",
  q: "♛︎",
  r: "♜︎",
  b: "♝︎",
  n: "♞︎",
  p: "♟︎",
};

export function pieceGlyph(type: PieceSymbol): string {
  return GLYPHS[type];
}

// Symbol fonts first, so no device falls back to a colour emoji (the emoji pawn ignores the colour and looks the same for both sides).
const FONT: CSSProperties = {
  fontFamily: '"Noto Sans Symbols 2", "Segoe UI Symbol", "DejaVu Sans", "Arial Unicode MS", "Apple Symbols", sans-serif',
  fontVariantEmoji: "text",
} as CSSProperties;

/** A fill that is a gradient, drawn through the shape of the piece. */
function gradient(from: string, to: string, shadow: string): CSSProperties {
  return {
    backgroundImage: `linear-gradient(160deg, ${from}, ${to})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
    filter: shadow,
  } as CSSProperties;
}

const SETS: Record<PieceSetId, { w: CSSProperties; b: CSSProperties }> = {
  classic: {
    w: { color: "#ffffff", textShadow: "0 0 2px #000, 0 0 1px #000, 0 1px 1px #000" },
    b: { color: "var(--piece-b, #161616)", textShadow: "var(--piece-b-shadow, 0 0 1px rgba(255,255,255,0.35))" },
  },
  gold: {
    w: gradient("#fff3b0", "#c9951a", "drop-shadow(0 1px 1px rgba(0,0,0,0.85))"),
    b: gradient("#4b4b57", "#14141b", "drop-shadow(0 0 1px #e6b422) drop-shadow(0 1px 1px rgba(0,0,0,0.6))"),
  },
  neon: {
    w: { color: "#9ff8ff", filter: "drop-shadow(0 0 2px #00e5ff) drop-shadow(0 0 6px #00b8d4)" },
    b: { color: "#ff7af0", filter: "drop-shadow(0 0 2px #ff2bd6) drop-shadow(0 0 6px #c000a0)" },
  },
  ruby: {
    w: gradient("#ffffff", "#cfd8e8", "drop-shadow(0 1px 1px rgba(0,0,0,0.8))"),
    b: gradient("#ff6b7d", "#7a0b1f", "drop-shadow(0 1px 1px rgba(0,0,0,0.7))"),
  },
  ice: {
    w: { color: "#f2fbff", filter: "drop-shadow(0 0 2px #38bdf8) drop-shadow(0 1px 1px rgba(0,0,0,0.5))" },
    b: { color: "#0b2545", filter: "drop-shadow(0 0 1px #7dd3fc) drop-shadow(0 1px 1px rgba(255,255,255,0.3))" },
  },
  wood: {
    w: gradient("#f9e6bd", "#c4934f", "drop-shadow(0 1px 1px rgba(40,20,0,0.9))"),
    b: gradient("#7d4d2c", "#2b180c", "drop-shadow(0 1px 1px rgba(0,0,0,0.6))"),
  },
  outline: {
    w: { color: "rgba(255,255,255,0.18)", WebkitTextStroke: "0.045em #ffffff", filter: "drop-shadow(0 0 1px #000) drop-shadow(0 0 1px #000)" } as CSSProperties,
    b: { color: "rgba(0,0,0,0.12)", WebkitTextStroke: "0.045em #0a0a0a", filter: "drop-shadow(0 0 1px rgba(255,255,255,0.7))" } as CSSProperties,
  },
  retro: {
    w: { color: "#b9ffa6", filter: "drop-shadow(0 0 3px #39ff14)" },
    b: { color: "#0d3b0d", filter: "drop-shadow(0 0 1px #b9ffa6) drop-shadow(0 0 2px #39ff14)" },
  },
  sunset: {
    w: gradient("#fff1c2", "#ff8a3d", "drop-shadow(0 1px 1px rgba(60,10,0,0.8))"),
    b: gradient("#7b2a8f", "#1c0726", "drop-shadow(0 0 1px #ff8a3d)"),
  },
};

export function isPieceSet(value: unknown): value is PieceSetId {
  return (PIECE_SET_IDS as readonly unknown[]).includes(value);
}

/** The look of one side's pieces. Each player's chosen design shows on their own pieces. */
export function pieceStyle(color: Color, set: PieceSetId = "classic"): CSSProperties {
  const style = SETS[set] ?? SETS.classic;
  return { ...FONT, ...style[color] };
}
