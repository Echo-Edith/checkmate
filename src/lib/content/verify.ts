import { Chess } from "chess.js";
import { parseUci } from "@/lib/chess-utils";

export type AttemptStatus = "invalid" | "wrong" | "in_progress" | "solved";

export interface AttemptResult {
  status: AttemptStatus;
  /** The opponent's scripted reply (UCI) when the attempt is still in progress. */
  reply: string | null;
}

/**
 * Checks a list of the player's moves (UCI) against accepted solution lines.
 * Used on the client to drive the puzzle and on the server to verify results,
 * so progress can never be claimed without actually solving the position.
 */
export function evaluateAttempt(
  fen: string,
  lines: readonly (readonly string[])[],
  userMoves: readonly string[],
  mateAny = false,
): AttemptResult {
  let game: Chess;
  try {
    game = new Chess(fen);
  } catch {
    return { status: "invalid", reply: null };
  }
  if (userMoves.length === 0) return { status: "in_progress", reply: null };

  let candidates = lines;
  let reply: string | null = null;

  for (let k = 0; k < userMoves.length; k++) {
    const uci = userMoves[k];
    const parsed = uci ? parseUci(uci) : null;
    if (!uci || !parsed) return { status: "invalid", reply: null };

    try {
      game.move(parsed);
    } catch {
      return { status: "invalid", reply: null };
    }

    const isLast = k === userMoves.length - 1;
    const matching = candidates.filter((line) => line[2 * k] === uci);

    if (matching.length === 0) {
      if (mateAny && game.isCheckmate()) {
        return isLast ? { status: "solved", reply: null } : { status: "invalid", reply: null };
      }
      return { status: "wrong", reply: null };
    }
    candidates = matching;

    if (candidates.some((line) => line.length === 2 * k + 1)) {
      return isLast ? { status: "solved", reply: null } : { status: "invalid", reply: null };
    }

    const next = candidates.find((line) => line.length > 2 * k + 1);
    const scripted = next?.[2 * k + 1];
    const scriptedMove = scripted ? parseUci(scripted) : null;
    if (!scripted || !scriptedMove) return { status: "invalid", reply: null };
    try {
      game.move(scriptedMove);
    } catch {
      return { status: "invalid", reply: null };
    }
    reply = scripted;
  }

  return { status: "in_progress", reply };
}
