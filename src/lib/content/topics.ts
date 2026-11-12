import type { Difficulty } from "@/lib/content/puzzles";

/** Topics for the endless lessons. Lesson number n uses topic n % length, and a new angle each time round. */
export const TOPICS: ReadonlyArray<{ title: string; level: Difficulty; idea: string }> = [
  { title: "Control the centre", level: "beginner", idea: "why the four central squares matter and how pawns and pieces fight for them" },
  { title: "Develop your pieces", level: "beginner", idea: "getting knights and bishops out early and not moving the same piece twice" },
  { title: "Castle early", level: "beginner", idea: "king safety and connecting the rooks" },
  { title: "Forks", level: "beginner", idea: "attacking two pieces at once, especially with knights" },
  { title: "Pins", level: "beginner", idea: "a piece that cannot move because something more valuable stands behind it" },
  { title: "Skewers", level: "beginner", idea: "attacking a valuable piece that must move and exposes another" },
  { title: "Discovered attacks", level: "intermediate", idea: "moving one piece to uncover an attack from another" },
  { title: "Back-rank mates", level: "beginner", idea: "mating a king trapped behind its own pawns and how to make luft" },
  { title: "Trading pieces wisely", level: "beginner", idea: "when to trade, piece values and simplifying when ahead" },
  { title: "Opening principles", level: "beginner", idea: "the simple rules that guide good opening play" },
  { title: "The Italian Game", level: "intermediate", idea: "ideas and typical plans for both sides" },
  { title: "The Sicilian Defence", level: "intermediate", idea: "black's fighting reply to 1.e4 and its main ideas" },
  { title: "The Queen's Gambit", level: "intermediate", idea: "ideas for white and how black can answer" },
  { title: "Pawn structure basics", level: "intermediate", idea: "isolated, doubled and passed pawns" },
  { title: "Outposts for knights", level: "intermediate", idea: "strong squares that enemy pawns cannot attack" },
  { title: "Open files and rooks", level: "intermediate", idea: "putting rooks on open files and the seventh rank" },
  { title: "Good and bad bishops", level: "intermediate", idea: "how your own pawns affect your bishop" },
  { title: "King and pawn endings", level: "intermediate", idea: "opposition and the square of the pawn" },
  { title: "Rook endings", level: "advanced", idea: "the Lucena and Philidor positions in simple words" },
  { title: "Zugzwang", level: "advanced", idea: "positions where having to move is a disadvantage" },
  { title: "Prophylaxis", level: "advanced", idea: "stopping the opponent's plan before it starts" },
  { title: "Attacking the king", level: "advanced", idea: "when to attack, sacrifices and bringing more pieces to the attack" },
  { title: "Calculating variations", level: "advanced", idea: "candidate moves, checking forcing lines first and avoiding blunders" },
  { title: "Overloaded pieces", level: "intermediate", idea: "a defender with too many jobs" },
  { title: "Deflection and decoy", level: "intermediate", idea: "pulling a defender away or luring a piece to a bad square" },
  { title: "Time and tempo", level: "intermediate", idea: "gaining moves and why speed matters in open positions" },
  { title: "Planning in the middlegame", level: "advanced", idea: "finding weaknesses and making a simple plan" },
  { title: "Converting an advantage", level: "advanced", idea: "how to turn a better position into a win" },
  { title: "Defending a worse position", level: "advanced", idea: "staying calm, trading attackers and setting traps" },
  { title: "Common opening traps", level: "beginner", idea: "traps to avoid and why they work" },
];

export function topicFor(n: number): { title: string; level: Difficulty; idea: string; round: number } {
  const topic = TOPICS[n % TOPICS.length]!;
  return { ...topic, round: Math.floor(n / TOPICS.length) };
}
