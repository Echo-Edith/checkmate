import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LESSONS } from "@/lib/content/lessons";
import type { Difficulty } from "@/lib/content/puzzles";
import { getProgress } from "@/lib/db/progress";

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
  if (user) {
    try {
      completed = (await getProgress(user.id)).lessons;
    } catch {
      // Progress is optional here; the list still works without it.
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Lessons</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        {user
          ? `${completed.length} of ${LESSONS.length} lessons completed.`
          : "Log in to save your progress."}
      </p>

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
                        ✓ Done
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
