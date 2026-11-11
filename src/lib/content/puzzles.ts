export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface Puzzle {
  id: string;
  title: string;
  difficulty: Difficulty;
  /** Short theme label shown to the user. */
  theme: string;
  /** What the user must achieve, e.g. "Mate in 1". */
  goal: string;
  /** Start position. The side to move is the player. */
  fen: string;
  /**
   * Accepted solution lines in UCI. Index 0, 2, 4... are the player's moves;
   * index 1, 3, 5... are the opponent's scripted replies.
   */
  lines: string[][];
  /** If true, any move that delivers checkmate on the final step is accepted. */
  mateAny?: boolean;
  /** Level-1 hint written by hand. Level-2 hints come from the Coach AI. */
  hint: string;
}

export const PUZZLES: readonly Puzzle[] = [
  {
    id: "b1-back-rank",
    title: "Back-rank mate",
    difficulty: "beginner",
    theme: "Back-rank mate",
    goal: "Mate in 1",
    fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
    lines: [["a1a8"]],
    mateAny: true,
    hint: "The black king is trapped behind its own pawns. Check it along the back rank.",
  },
  {
    id: "b2-scholars-mate",
    title: "Scholar's mate",
    difficulty: "beginner",
    theme: "Checkmate",
    goal: "Mate in 1",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    lines: [["h5f7"]],
    mateAny: true,
    hint: "Your queen and bishop both aim at the same weak square near the black king.",
  },
  {
    id: "b3-queen-mate",
    title: "Queen and king",
    difficulty: "beginner",
    theme: "Checkmate",
    goal: "Mate in 1",
    fen: "7k/8/5K2/8/8/8/8/6Q1 w - - 0 1",
    lines: [["g1g7"]],
    mateAny: true,
    hint: "Put the queen next to the king, on a square your own king protects.",
  },
  {
    id: "b4-free-queen",
    title: "Free queen",
    difficulty: "beginner",
    theme: "Hanging piece",
    goal: "Win material",
    fen: "4k3/8/8/8/3q4/8/8/3RK3 w - - 0 1",
    lines: [["d1d4"]],
    hint: "Look for a black piece that nothing is protecting.",
  },
  {
    id: "b5-free-bishop",
    title: "Free bishop",
    difficulty: "beginner",
    theme: "Hanging piece",
    goal: "Win material",
    fen: "4k3/8/8/3b4/8/4N3/8/4K3 w - - 0 1",
    lines: [["e3d5"]],
    hint: "One of your pieces attacks an undefended black piece.",
  },
  {
    id: "b6-rook-mate",
    title: "Rook finishes it",
    difficulty: "beginner",
    theme: "Checkmate",
    goal: "Mate in 1",
    fen: "6k1/8/6K1/8/8/8/8/R7 w - - 0 1",
    lines: [["a1a8"]],
    mateAny: true,
    hint: "Your king already blocks the escape squares. Use the rook to give check.",
  },
  {
    id: "i1-knight-fork",
    title: "Royal fork",
    difficulty: "intermediate",
    theme: "Fork",
    goal: "Win the queen",
    fen: "2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1",
    lines: [["d5e7", "g8h8", "e7c8"]],
    hint: "A knight can attack two pieces at once. Which square attacks the king and the queen?",
  },
  {
    id: "i2-pawn-fork",
    title: "Pawn fork",
    difficulty: "intermediate",
    theme: "Fork",
    goal: "Win a knight",
    fen: "4k3/8/3n1n2/8/4P3/8/8/4K3 w - - 0 1",
    lines: [["e4e5", "d6b5", "e5f6"]],
    hint: "Even a pawn can attack two pieces at the same time.",
  },
  {
    id: "i3-skewer",
    title: "Rook skewer",
    difficulty: "intermediate",
    theme: "Skewer",
    goal: "Win the queen",
    fen: "8/8/8/q2k4/8/8/8/6KR w - - 0 1",
    lines: [["h1h5", "d5d6", "h5a5"]],
    hint: "Check the king so that it must move away, uncovering the queen behind it.",
  },
  {
    id: "i4-discovered-attack",
    title: "Discovered check",
    difficulty: "intermediate",
    theme: "Discovered attack",
    goal: "Win the queen",
    fen: "4k3/6q1/8/4B3/8/8/8/4R2K w - - 0 1",
    lines: [["e5g7"]],
    hint: "Your bishop is blocking your rook. When the bishop moves, it can capture something with check.",
  },
  {
    id: "i5-battery-mate",
    title: "Queen and bishop battery",
    difficulty: "intermediate",
    theme: "Battery",
    goal: "Mate in 1",
    fen: "5rk1/5ppp/8/8/8/3Q4/5PPP/1B4K1 w - - 0 1",
    lines: [["d3h7"]],
    mateAny: true,
    hint: "The queen and bishop line up on one diagonal. The square at the end is protected by the bishop.",
  },
  {
    id: "i6-smothered-mate",
    title: "Smothered mate",
    difficulty: "intermediate",
    theme: "Smothered mate",
    goal: "Mate in 1",
    fen: "6rk/6pp/8/4N3/8/8/8/6K1 w - - 0 1",
    lines: [["e5f7"]],
    mateAny: true,
    hint: "The black king is surrounded by its own pieces. Only a knight can give check from here.",
  },
  {
    id: "a1-ladder-mate",
    title: "Rook ladder",
    difficulty: "advanced",
    theme: "Mate in 2",
    goal: "Mate in 2",
    fen: "7k/8/8/8/8/8/R7/1R4K1 w - - 0 1",
    lines: [
      ["b1b7", "h8g8", "a2a8"],
      ["a2a7", "h8g8", "b1b8"],
    ],
    hint: "Use one rook to cut the king off on the 7th rank. The second rook then finishes on the 8th rank.",
  },
  {
    id: "a2-queen-trade-mate",
    title: "Deflect the defender",
    difficulty: "advanced",
    theme: "Mate in 2",
    goal: "Mate in 2",
    fen: "2rq2k1/5ppp/8/8/8/8/3Q1PPP/3R2K1 w - - 0 1",
    lines: [["d2d8", "c8d8", "d1d8"]],
    hint: "Offer a queen trade on the d-file. After the black rook recaptures, your other rook is ready.",
  },
];

export function getPuzzle(id: string): Puzzle | undefined {
  return PUZZLES.find((puzzle) => puzzle.id === id);
}
