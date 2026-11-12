import type { Metadata } from "next";
import { PuzzleTrainer, type PuzzleStats } from "@/components/puzzles/PuzzleTrainer";
import { getCurrentUser } from "@/lib/auth";
import { DAILY_PUZZLES } from "@/lib/content/generate";
import { getDaily, getProgress } from "@/lib/db/progress";

export const metadata: Metadata = { title: "Puzzles — Checkm8" };
export const dynamic = "force-dynamic";

export default async function PuzzlesPage() {
  const user = await getCurrentUser();

  let todayIds: string[] = [];
  let stats: PuzzleStats = { solved: [], attempts: 0, correct: 0, streak: 0, bestStreak: 0 };
  if (user) {
    try {
      const { puzzles } = await getProgress(user.id);
      todayIds = (await getDaily(user.id)).puzzles;
      stats = {
        solved: puzzles.solved,
        attempts: puzzles.attempts,
        correct: puzzles.correct,
        streak: puzzles.streak,
        bestStreak: puzzles.bestStreak,
      };
    } catch {
      // Puzzles still work without saved progress.
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Puzzles</h1>
      <PuzzleTrainer loggedIn={Boolean(user)} initialStats={stats} initialToday={todayIds} dailyLimit={DAILY_PUZZLES} />
    </main>
  );
}
