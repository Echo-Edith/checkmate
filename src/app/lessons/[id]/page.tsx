import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpeakButton } from "@/components/SpeakButton";
import { LessonPractice } from "@/components/lessons/LessonPractice";
import { getCurrentUser } from "@/lib/auth";
import { getLesson, LESSONS } from "@/lib/content/lessons";
import { getProgress } from "@/lib/db/progress";

export const dynamic = "force-dynamic";

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { id } = await params;
  const lesson = getLesson(id);
  return { title: lesson ? `${lesson.title} — Checkm8` : "Lesson — Checkm8" };
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { id } = await params;
  const lesson = getLesson(id);
  if (!lesson) notFound();

  const user = await getCurrentUser();
  let alreadyCompleted = false;
  if (user) {
    try {
      alreadyCompleted = (await getProgress(user.id)).lessons.includes(lesson.id);
    } catch {
      // Not fatal: the lesson is still readable.
    }
  }

  const index = LESSONS.findIndex((item) => item.id === lesson.id);
  const next = LESSONS[index + 1];
  const previous = index > 0 ? LESSONS[index - 1] : undefined;

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
        {next ? (
          <Link href={`/lessons/${next.id}`} className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold">
            Next lesson →
          </Link>
        ) : (
          <Link href="/puzzles" className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold">
            Try puzzles →
          </Link>
        )}
      </nav>
    </main>
  );
}
