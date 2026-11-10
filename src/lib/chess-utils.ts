import { Chess, type PieceSymbol, type Square } from "chess.js";

export interface PlayedMove {
  from: Square;
  to: Square;
  san: string;
}

export type PromotionPiece = Extract<PieceSymbol, "q" | "r" | "b" | "n">;

/** Rebuilds a game by replaying SAN moves, so repetition and 50-move draw rules stay correct. */
export function replay(moves: readonly PlayedMove[], count: number = moves.length): Chess {
  const game = new Chess();
  for (const move of moves.slice(0, count)) {
    game.move(move.san);
  }
  return game;
}

export interface UciMove {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

/** Parses "e2e4" or "e7e8q". Returns null if malformed. */
export function parseUci(uci: string): UciMove | null {
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci);
  if (!match || !match[1] || !match[2]) return null;
  const move: UciMove = { from: match[1] as Square, to: match[2] as Square };
  if (match[3]) move.promotion = match[3] as PromotionPiece;
  return move;
}

/** Converts a UCI move to SAN for a FEN. Returns null if the move is illegal there. */
export function uciToSan(fen: string, uci: string): string | null {
  const parsed = parseUci(uci);
  if (!parsed) return null;
  try {
    return new Chess(fen).move(parsed).san;
  } catch {
    return null;
  }
}

export interface GameStatus {
  over: boolean;
  /** "w" or "b" if someone won, "draw" for a draw, null if in progress. */
  result: "w" | "b" | "draw" | null;
  text: string;
}

export function getStatus(game: Chess): GameStatus {
  const side = game.turn() === "w" ? "White" : "Black";
  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "b" : "w";
    return { over: true, result: winner, text: `Checkmate — ${winner === "w" ? "White" : "Black"} wins` };
  }
  if (game.isStalemate()) return { over: true, result: "draw", text: "Draw by stalemate" };
  if (game.isInsufficientMaterial()) return { over: true, result: "draw", text: "Draw — insufficient material" };
  if (game.isThreefoldRepetition()) return { over: true, result: "draw", text: "Draw by threefold repetition" };
  if (game.isDraw()) return { over: true, result: "draw", text: "Draw by the fifty-move rule" };
  if (game.isCheck()) return { over: false, result: null, text: `${side} to move — check` };
  return { over: false, result: null, text: `${side} to move` };
}
