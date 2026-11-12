"use client";

import Link from "next/link";
import { useState } from "react";
import { TacticBoard } from "@/components/chess/TacticBoard";
import type { Practice } from "@/lib/content/lessons";

interface LessonPracticeProps {
  lessonId: string;
  practice: Practice | undefined;
  loggedIn: boolean;
  alreadyCompleted: boolean;
  nextLessonHref: string | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function LessonPractice({ lessonId, practice, loggedIn, alreadyCompleted, nextLessonHref }: LessonPracticeProps) {
  const [solved, setSolved] = useState(!practice);
  const [saveState, setSaveState] = useState<SaveState>(alreadyCompleted ? "saved" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [moves, setMoves] = useState<string[]>([]);

  async function complete(playerMoves: string[]) {
    if (!loggedIn) return;
    setSaveState("saving");
    setError(null);
    try {
      const response = await fetch("/api/progress/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, moves: playerMoves }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Could not save progress.");
      }
      setSaveState("saved");
      window.dispatchEvent(new Event("checkm8:check-achievements"));
    } catch (err) {
      setSaveState("error");
      setError(err instanceof Error ? err.message : "Could not save progress.");
    }
  }

  function handleSolved(playerMoves: string[]) {
    setSolved(true);
    setMoves(playerMoves);
    void complete(playerMoves);
  }

  return (
    <div className="space-y-5">
      {practice && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Try it yourself</h2>
          <p className="text-sm">{practice.prompt}</p>
          <TacticBoard
            fen={practice.fen}
            lines={practice.lines}
            mateAny={practice.mateAny}
            onSolved={handleSolved}
            solvedMessage={practice.explanation}
          />
        </section>
      )}

      <div className="space-y-2 text-sm">
        {!practice && saveState !== "saved" && loggedIn && (
          <button
            type="button"
            onClick={() => {
              setSolved(true);
              void complete(moves);
            }}
            disabled={saveState === "saving"}
            className="rounded-md px-4 py-2 font-medium text-[color:var(--accent-fg)] disabled:opacity-60"
            style={{ background: "var(--accent)" }}
          >
            {saveState === "saving" ? "Saving…" : "Mark lesson as complete"}
          </button>
        )}
        {solved && saveState === "saved" && <p style={{ color: "var(--accent)" }}>Lesson complete. Progress saved.</p>}
        {!loggedIn && (
          <p style={{ color: "var(--muted)" }}>
            <Link href="/login" className="underline">
              Log in
            </Link>{" "}
            to save your lesson progress.
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-500">
            {error}
          </p>
        )}
        {nextLessonHref && (
          <Link href={nextLessonHref} className="inline-block underline">
            Next lesson →
          </Link>
        )}
      </div>
    </div>
  );
}
