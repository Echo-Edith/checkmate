import type { PlyAnalysis } from "@/lib/analysis/analyze";
import type { MoveClassification } from "@/lib/tutor/schema";

/** Moves worth stopping for during the replay. */
export const IMPORTANT: ReadonlySet<MoveClassification> = new Set(["inaccuracy", "mistake", "blunder"]);

const TITLES: Record<MoveClassification, string> = {
  best: "Best move",
  good: "Good move",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

export function titleFor(classification: MoveClassification): string {
  return TITLES[classification];
}

/**
 * A short explanation made only from the Stockfish numbers. It is always correct,
 * so it is shown when the AI is unavailable or when its answer fails the check below.
 */
export function factualNote(ply: PlyAnalysis): string {
  const who = ply.color === "w" ? "White" : "Black";
  const parts = [`${who} played ${ply.san}: ${titleFor(ply.classification).toLowerCase()}.`, `The engine's evaluation went from ${ply.evalBefore} to ${ply.evalAfter}.`];
  if (ply.bestSan && ply.classification !== "best") parts.push(`A better move was ${ply.bestSan}.`);
  if (ply.missed) parts.push("This gave away a clearly better position.");
  return parts.join(" ");
}

const stripCheck = (san: string) => san.replace(/[+#]/g, "");

/**
 * Makes sure the AI did not invent anything: it may only name the move that was played and the engine's
 * preferred move, and may only quote evaluation numbers the engine produced.
 */
export function isFaithful(text: string, ply: PlyAnalysis): boolean {
  const allowedMoves = new Set([ply.san, ply.bestSan].filter(Boolean).map((san) => stripCheck(san as string)));
  const moveWords = text.match(/\b(?:[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[QRBN])?|O-O(?:-O)?)[+#]?/g) ?? [];
  for (const word of moveWords) {
    if (!allowedMoves.has(stripCheck(word))) return false;
  }
  const allowedNumbers = new Set(
    [ply.evalBefore, ply.evalAfter].flatMap((value) => value.match(/\d+(?:\.\d+)?/g) ?? []),
  );
  for (const number of text.match(/\d+\.\d+/g) ?? []) {
    if (!allowedNumbers.has(number)) return false;
  }
  return true;
}

/** How long to leave a comment on screen when nothing is read aloud. */
export function readMs(text: string): number {
  return Math.min(9000, Math.max(2500, text.split(/\s+/).length * 330));
}
