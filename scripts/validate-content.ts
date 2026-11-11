/**
 * Validates every puzzle and lesson position with real chess.js:
 * FENs load, every move in every line is legal, and mate puzzles really end in checkmate.
 * Run with: npm run validate:content
 */
import { Chess } from "chess.js";
import { LESSONS } from "../src/lib/content/lessons";
import { PUZZLES } from "../src/lib/content/puzzles";
import { parseUci } from "../src/lib/chess-utils";

let failures = 0;
function fail(message: string): void {
  failures += 1;
  console.error(`FAIL  ${message}`);
}

function checkPosition(
  label: string,
  fen: string,
  lines: readonly (readonly string[])[],
  mateAny: boolean | undefined,
  mateGoal: boolean,
): void {
  let start: Chess;
  try {
    start = new Chess(fen);
  } catch {
    fail(`${label}: invalid FEN "${fen}"`);
    return;
  }
  if (start.isGameOver()) fail(`${label}: start position is already game over`);
  if (lines.length === 0) fail(`${label}: no solution lines`);

  for (const line of lines) {
    const game = new Chess(fen);
    line.forEach((uci, index) => {
      const move = parseUci(uci);
      if (!move) return fail(`${label}: malformed move "${uci}"`);
      try {
        game.move(move);
      } catch {
        fail(`${label}: illegal move ${uci} at index ${index} in line [${line.join(" ")}]`);
      }
    });
    if ((mateAny || mateGoal) && !game.isCheckmate()) {
      fail(`${label}: line [${line.join(" ")}] does not end in checkmate`);
    }
    if (line.length % 2 === 0) fail(`${label}: line [${line.join(" ")}] must end on a player move`);
  }
}

const seen = new Set<string>();
for (const puzzle of PUZZLES) {
  if (seen.has(puzzle.id)) fail(`duplicate puzzle id ${puzzle.id}`);
  seen.add(puzzle.id);
  checkPosition(`puzzle ${puzzle.id}`, puzzle.fen, puzzle.lines, puzzle.mateAny, /mate/i.test(puzzle.goal));
}

const seenLessons = new Set<string>();
for (const lesson of LESSONS) {
  if (seenLessons.has(lesson.id)) fail(`duplicate lesson id ${lesson.id}`);
  seenLessons.add(lesson.id);
  if (lesson.practice) {
    const { fen, lines, mateAny } = lesson.practice;
    checkPosition(`lesson ${lesson.id}`, fen, lines, mateAny, false);
  }
}

console.log(`Checked ${PUZZLES.length} puzzles and ${LESSONS.length} lessons.`);
if (failures > 0) {
  console.error(`${failures} problem(s) found.`);
  process.exit(1);
}
console.log("All content is valid.");
