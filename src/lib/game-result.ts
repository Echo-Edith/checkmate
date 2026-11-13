import { Chess } from "chess.js";

export interface GameStatus {
  over: boolean;
  /** "w" or "b" if someone won, "draw" for a draw, null if in progress. */
  result: "w" | "b" | "draw" | null;
  text: string;
}

export type PgnResult = "1-0" | "0-1" | "1/2-1/2";

/** The only ways a game can end on the board. Anything else means the game is still going. */
export function positionStatus(game: Chess): GameStatus {
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

export type DecideOutcome =
  | { ok: true; result: PgnResult; reason: "board" | "resignation"; resigned: boolean }
  | { ok: false; error: "illegal" | "empty" | "unfinished" };

/**
 * Decides the saved result of a game from its SAN moves.
 * - Reaching the end of the move list is NOT a loss.
 * - A game ends only by checkmate, stalemate, insufficient material, threefold repetition,
 *   the fifty-move rule, or resignation against the computer.
 * - If the board already ended the game, that result wins over any resign flag.
 */
export function decideResult(
  moves: readonly string[],
  color: "w" | "b",
  mode: "computer" | "friend" | string,
  resigned: boolean,
): DecideOutcome {
  if (moves.length === 0) return { ok: false, error: "empty" };
  const game = new Chess();
  for (const san of moves) {
    try {
      game.move(san);
    } catch {
      return { ok: false, error: "illegal" };
    }
  }
  const status = positionStatus(game);
  if (status.over && status.result) {
    const result: PgnResult = status.result === "draw" ? "1/2-1/2" : status.result === "w" ? "1-0" : "0-1";
    return { ok: true, result, reason: "board", resigned: false };
  }
  if (resigned && mode === "computer") {
    return { ok: true, result: color === "w" ? "0-1" : "1-0", reason: "resignation", resigned: true };
  }
  return { ok: false, error: "unfinished" };
}
