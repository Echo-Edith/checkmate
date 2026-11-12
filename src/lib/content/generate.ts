import { Chess } from "chess.js";
import { PUZZLES, type Puzzle } from "@/lib/content/puzzles";

/** Daily limits. */
export const DAILY_LESSONS = 2;
export const DAILY_PUZZLES = 5;

const PIECE_NAMES: Record<string, string> = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map<number, Puzzle>();

/**
 * Makes a "mate in 1" puzzle from a number. The same number always gives the same puzzle,
 * so the server can rebuild it to check an answer. The position comes from random play,
 * and chess.js confirms that the side to move really has a checkmate.
 */
export function generateMatePuzzle(seed: number): Puzzle {
  const cached = cache.get(seed);
  if (cached) return cached;
  const rnd = mulberry32(seed * 7919 + 13);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const game = new Chess();
    const maxPlies = 24 + Math.floor(rnd() * 100);
    for (let ply = 0; ply < maxPlies; ply += 1) {
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) break;
      if (ply >= 12) {
        const mate = moves.find((move) => move.san.endsWith("#"));
        if (mate) {
          const puzzle: Puzzle = {
            id: `g-${seed}`,
            title: `Find the checkmate`,
            difficulty: "beginner",
            theme: "Checkmate",
            goal: "Mate in 1",
            fen: game.fen(),
            lines: [[`${mate.from}${mate.to}${mate.promotion ?? ""}`]],
            mateAny: true,
            hint: `Look for a move that attacks the king so it cannot escape. A ${PIECE_NAMES[mate.piece] ?? "piece"} can do it.`,
          };
          cache.set(seed, puzzle);
          if (cache.size > 200) cache.delete(cache.keys().next().value as number);
          return puzzle;
        }
      }
      // Prefer captures and checks so the game becomes sharp quickly.
      const sharp = moves.filter((move) => move.flags.includes("c") || move.san.includes("+"));
      const pool = sharp.length > 0 && rnd() < 0.5 ? sharp : moves;
      const pick = pool[Math.floor(rnd() * pool.length)];
      if (!pick) break;
      game.move(pick);
    }
  }
  throw new Error("Could not make a puzzle");
}

/** Built-in puzzles plus the endless made-up ones (ids like "g-1234"). */
export function findPuzzle(id: string): Puzzle | undefined {
  const builtIn = PUZZLES.find((puzzle) => puzzle.id === id);
  if (builtIn) return builtIn;
  const match = /^g-(\d{1,7})$/.exec(id);
  if (!match) return undefined;
  try {
    return generateMatePuzzle(Number(match[1]));
  } catch {
    return undefined;
  }
}
