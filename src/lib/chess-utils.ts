import { Chess, type PieceSymbol, type Square } from "chess.js";
import { positionStatus, type GameStatus } from "./game-result";

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

export type { GameStatus } from "./game-result";

export function getStatus(game: Chess): GameStatus {
  return positionStatus(game);
}
