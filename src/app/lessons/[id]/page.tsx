import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpeakButton } from "@/components/SpeakButton";
import { LessonPractice } from "@/components/lessons/LessonPractice";
import { getCurrentUser } from "@/lib/auth";
import { DAILY_LESSONS } from "@/lib/content/generate";
import { generatedLessonNumber, resolveLesson } from "@/lib/content/lesson-source";
import { LESSONS } from "@/lib/content/lessons";
import { getLang } from "@/lib/i18n/server";
import { getDaily, getProgress } from "@/lib/db/progress";

export const dynamic = "force-dynamic";

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { id } = await params;
  const lesson = await resolveLesson(id, await getLang());
  return { title: lesson ? `${lesson.title} — Checkm8` : "Lesson — Checkm8" };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params;
  const lesson = await resolveLesson(id, await getLang());
  if (!lesson) notFound();

  const user = await getCurrentUser();
  let alreadyCompleted = false;
  let limitReached = false;
  if (user) {
    try {
      alreadyCompleted = (await getProgress(user.id)).lessons.includes(lesson.id);
      limitReached = !alreadyCompleted && (await getDaily(user.id)).lessons.length >= DAILY_LESSONS;
    } catch {
      // Not fatal: the lesson is still readable.
    }
  }

  const generatedNumber = generatedLessonNumber(lesson.id);
  const index = LESSONS.findIndex((item) => item.id === lesson.id);
  const next = generatedNumber !== null ? { id: `g-${generatedNumber + 1}` } : (LESSONS[index + 1] ?? { id: "g-0" });
  const previous = generatedNumber !== null ? (generatedNumber > 0 ? { id: `g-${generatedNumber - 1}` } : LESSONS[LESSONS.length - 1]) : index > 0 ? LESSONS[index - 1] : undefined;

  if (limitReached) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href="/lessons" className="text-sm underline" style={{ color: "var(--muted)" }}>
          ← All lessons
        </Link>
        <div className="card mt-6 p-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">That is all for today</h1>
          <p className="mt-2" style={{ color: "var(--muted)" }}>
            You did {DAILY_LESSONS} lessons today. Come back tomorrow for more. The day changes at 00:00 UTC.
          </p>
          <Link href="/puzzles" className="btn-primary mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-semibold">
            Try puzzles →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/lessons" className="text-sm underline" style={{ color: "var(--muted)" }}>
        ← All lessons
      </Link>
      <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {lesson.level}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{lesson.title}</h1>
      <SpeakButton className="mt-3" text={`${lesson.title}. ${lesson.body.join(" ")}`} label="Listen to lesson" />

      <div className="mt-5 space-y-4 leading-relaxed">
        {lesson.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-8">
        <LessonPractice
          lessonId={lesson.id}
          practice={lesson.practice}
          loggedIn={Boolean(user)}
          alreadyCompleted={alreadyCompleted}
          nextLessonHref={null}
        />
      </div>

      <nav aria-label="Lesson navigation" className="mt-8 flex flex-wrap items-center justify-between gap-2">
        {previous ? (
          <Link href={`/lessons/${previous.id}`} className="card card-hover px-4 py-3 text-sm font-medium">
            ← Previous
          </Link>
        ) : null}
        <Link href="/lessons" className="card px-4 py-3 text-sm font-medium">
          All lessons
        </Link>
        <Link href={`/lessons/${next.id}`} className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold">
          Next lesson →
        </Link>
      </nav>
    </main>
  );
}
