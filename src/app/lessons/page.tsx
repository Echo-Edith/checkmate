import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LESSONS } from "@/lib/content/lessons";
import type { Difficulty } from "@/lib/content/puzzles";
import { PieceLineup } from "@/components/chess/PieceLineup";
import { DAILY_LESSONS } from "@/lib/content/generate";
import { getDaily, getProgress } from "@/lib/db/progress";

export const metadata: Metadata = { title: "Lessons — Checkm8" };
export const dynamic = "force-dynamic";

const LEVELS: Array<{ key: Difficulty; title: string }> = [
  { key: "beginner", title: "Beginner" },
  { key: "intermediate", title: "Intermediate" },
  { key: "advanced", title: "Advanced" },
];

export default async function LessonsPage() {
  const user = await getCurrentUser();
  let completed: string[] = [];
  let todayCount = 0;
  if (user) {
    try {
      completed = (await getProgress(user.id)).lessons;
      todayCount = (await getDaily(user.id)).lessons.length;
    } catch {
      // Progress is optional here; the list still works without it.
    }
  }

  const upNext = LESSONS.find((lesson) => !completed.includes(lesson.id)) ?? LESSONS[0];
  // Endless lessons: the first one that is not done yet.
  let nextGenerated = 0;
  while (completed.includes(`g-${nextGenerated}`)) nextGenerated += 1;
  const limitReached = user !== null && todayCount >= DAILY_LESSONS;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Lessons</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        {user
          ? `${completed.length} of ${LESSONS.length} lessons completed.`
          : "Log in to save your progress."}
      </p>
      {user && (
        <p className="mt-1 text-sm font-medium" style={{ color: limitReached ? "var(--accent)" : "var(--muted)" }}>
          Today: {Math.min(todayCount, DAILY_LESSONS)} of {DAILY_LESSONS} lessons
          {limitReached ? ". That is all for today. Come back tomorrow!" : "."}
        </p>
      )}
      {upNext && (
        <Link href={`/lessons/${upNext.id}`} className="btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold">
          {completed.length > 0 ? "Continue" : "Start"}: {upNext.title} →
        </Link>
      )}

      <section className="card mt-6 p-4" aria-label="The pieces">
        <h2 className="mb-3 text-sm font-semibold">The pieces</h2>
        <PieceLineup />
      </section>

      {LEVELS.map((level) => (
        <section key={level.key} className="mt-8">
          <h2 className="text-lg font-semibold">{level.title}</h2>
          <ul className="mt-3 space-y-2">
            {LESSONS.filter((lesson) => lesson.level === level.key).map((lesson) => {
              const done = completed.includes(lesson.id);
              return (
                <li key={lesson.id}>
                  <Link
                    href={`/lessons/${lesson.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:opacity-90"
                    style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                  >
                    <span>
                      <span className="block font-medium">{lesson.title}</span>
                      <span className="block text-sm" style={{ color: "var(--muted)" }}>
                        {lesson.summary}
                      </span>
                    </span>
                    {done && (
                      <span className="shrink-0 text-xs font-medium" style={{ color: "var(--accent)" }}>
                        Done
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    
      <section className="mt-10">
        <h2 className="text-lg font-semibold">More lessons</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          New lessons are written for you, one after another. They never run out.
        </p>
        <Link href={`/lessons/g-${nextGenerated}`} className="btn-primary mt-3 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">
          Next new lesson →
        </Link>
      </section>
</main>
  );
}
