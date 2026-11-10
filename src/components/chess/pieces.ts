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
  return color === "w"
    ? { color: "#ffffff", textShadow: "0 0 2px #000, 0 0 1px #000, 0 1px 1px #000" }
    : { color: "#161616", textShadow: "0 0 1px rgba(255,255,255,0.35)" };
}
