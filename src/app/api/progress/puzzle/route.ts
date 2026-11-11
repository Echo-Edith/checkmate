import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getPuzzle } from "@/lib/content/puzzles";
import { evaluateAttempt } from "@/lib/content/verify";
import { getOrCreateProfile } from "@/lib/db/profiles";
import { recordPuzzleAttempt } from "@/lib/db/progress";

const bodySchema = z
  .object({
    puzzleId: z.string().max(60),
    outcome: z.enum(["solved", "failed"]),
    moves: z.array(z.string().max(5)).max(12).default([]),
    hintsUsed: z.number().int().min(0).max(2).default(0),
  })
  .strict();

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const puzzle = getPuzzle(parsed.data.puzzleId);
  if (!puzzle) return NextResponse.json({ error: "Unknown puzzle" }, { status: 404 });

  const solved = parsed.data.outcome === "solved";
  // A solve is only credited when the submitted moves really solve the puzzle.
  if (solved) {
    const result = evaluateAttempt(puzzle.fen, puzzle.lines, parsed.data.moves, puzzle.mateAny);
    if (result.status !== "solved") {
      return NextResponse.json({ error: "That is not a valid solution." }, { status: 400 });
    }
  }

  try {
    await getOrCreateProfile(user.id, user.email);
    const puzzles = await recordPuzzleAttempt(user.id, puzzle.id, solved, parsed.data.hintsUsed);
    return NextResponse.json({ puzzles });
  } catch (error) {
    console.error("POST /api/progress/puzzle failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not save progress" }, { status: 500 });
  }
}
