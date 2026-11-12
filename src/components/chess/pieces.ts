import type { CSSProperties } from "react";
import type { Color, PieceSymbol } from "chess.js";

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

/** Both sides use the filled glyphs; colour and outline tell them apart. */
export function pieceStyle(color: Color): CSSProperties {
  // Symbol fonts first, so no device falls back to a colour emoji (the emoji pawn ignores the colour and looks the same for both sides).
  const font: CSSProperties = {
    fontFamily: '"Noto Sans Symbols 2", "Segoe UI Symbol", "DejaVu Sans", "Arial Unicode MS", "Apple Symbols", sans-serif',
    fontVariantEmoji: "text",
  } as CSSProperties;
  return color === "w"
    ? {
        ...font, color: "#ffffff", textShadow: "0 0 2px #000, 0 0 1px #000, 0 1px 1px #000" }
    : { ...font, color: "var(--piece-b, #161616)", textShadow: "var(--piece-b-shadow, 0 0 1px rgba(255,255,255,0.35))" };
}
