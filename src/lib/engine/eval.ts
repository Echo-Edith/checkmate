import type { EngineScore } from "@/lib/engine/stockfish";

/** Win probability (0-100) for White, using the same curve Lichess uses. */
export function winPercent(score: EngineScore): number {
  if (score.mate !== null) {
    if (score.mate === 0) return 50;
    return score.mate > 0 ? 100 : 0;
  }
  const cp = Math.max(-1000, Math.min(1000, score.cp ?? 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Human-readable evaluation from White's point of view, e.g. "+0.35" or "Mate in 3". */
export function formatScore(score: EngineScore): string {
  if (score.mate !== null) {
    if (score.mate === 0) return "Checkmate";
    return `${score.mate > 0 ? "White" : "Black"} mates in ${Math.abs(score.mate)}`;
  }
  const pawns = (score.cp ?? 0) / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

/** Evaluation for compact JSON (storage efficient). */
export function scoreToCentipawns(score: EngineScore): number {
  if (score.mate !== null) return score.mate > 0 ? 10000 - score.mate : -10000 - score.mate;
  return score.cp ?? 0;
}
