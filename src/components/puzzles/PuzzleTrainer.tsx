"use client";

import Link from "next/link";
import { SpeakButton } from "@/components/SpeakButton";
import { useCallback, useMemo, useRef, useState } from "react";
import { TacticBoard } from "@/components/chess/TacticBoard";
import { PUZZLES, type Difficulty, type Puzzle } from "@/lib/content/puzzles";
import { askTutor, TutorClientError } from "@/lib/tutor/client";

export interface PuzzleStats {
  solved: string[];
  attempts: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

const FILTERS: Array<{ key: Difficulty | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "advanced", label: "Advanced" },
];

const borderStyle = { borderColor: "var(--border)" } as const;

interface PuzzleTrainerProps {
  loggedIn: boolean;
  initialStats: PuzzleStats;
}

export function PuzzleTrainer({ loggedIn, initialStats }: PuzzleTrainerProps) {
  const [filter, setFilter] = useState<Difficulty | "all">("all");
  const [current, setCurrent] = useState<Puzzle>(() => PUZZLES.find((p) => !initialStats.solved.includes(p.id)) ?? PUZZLES[0]!);
  const [stats, setStats] = useState<PuzzleStats>(initialStats);
  const [boardKey, setBoardKey] = useState(0);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hintsUsed = useRef(0);

  const visible = useMemo(() => PUZZLES.filter((p) => filter === "all" || p.difficulty === filter), [filter]);
  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : null;

  const report = useCallback(
    async (puzzle: Puzzle, outcome: "solved" | "failed", moves: string[]) => {
      // Update the visible stats immediately; the server result replaces them when it arrives.
      setStats((s) => {
        const streak = outcome === "solved" ? s.streak + 1 : 0;
        return {
          solved: outcome === "solved" && !s.solved.includes(puzzle.id) ? [...s.solved, puzzle.id] : s.solved,
          attempts: s.attempts + 1,
          correct: s.correct + (outcome === "solved" ? 1 : 0),
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
        };
      });
      if (!loggedIn) return;
      try {
        const response = await fetch("/api/progress/puzzle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ puzzleId: puzzle.id, outcome, moves, hintsUsed: hintsUsed.current }),
        });
        const data = (await response.json().catch(() => ({}))) as { puzzles?: PuzzleStats; error?: string };
        if (!response.ok || !data.puzzles) throw new Error(data.error ?? "Could not save.");
        setStats(data.puzzles);
        setMessage(null);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Could not save progress.");
      }
    },
    [loggedIn],
  );

  function select(puzzle: Puzzle) {
    setCurrent(puzzle);
    setBoardKey((k) => k + 1);
    setHintLevel(0);
    setAiHint(null);
    setMessage(null);
    hintsUsed.current = 0;
  }

  function nextPuzzle() {
    const pool = visible.length > 0 ? visible : PUZZLES;
    const unsolved = pool.filter((p) => !stats.solved.includes(p.id) && p.id !== current.id);
    const index = pool.findIndex((p) => p.id === current.id);
    select(unsolved[0] ?? pool[(index + 1) % pool.length] ?? current);
  }

  async function showHint() {
    if (hintLevel === 0) {
      setHintLevel(1);
      hintsUsed.current = 1;
      return;
    }
    if (hintLevel === 1) {
      setHintLevel(2);
      hintsUsed.current = 2;
      if (!loggedIn) return;
      setHintBusy(true);
      try {
        setAiHint(await askTutor({ kind: "puzzle_hint", puzzleId: current.id, hintLevel: 2 }));
      } catch (err) {
        setAiHint(err instanceof TutorClientError ? err.message : "The coach could not answer right now.");
      } finally {
        setHintBusy(false);
      }
    }
  }

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Streak", String(stats.streak)],
          ["Best streak", String(stats.bestStreak)],
          ["Accuracy", accuracy === null ? "—" : `${accuracy}%`],
          ["Solved", `${stats.solved.length}/${PUZZLES.length}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3" style={{ ...borderStyle, background: "var(--surface)" }}>
            <dt className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {label}
            </dt>
            <dd className="mt-1 text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      {!loggedIn && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          <Link href="/login" className="underline">
            Log in
          </Link>{" "}
          to save progress and get Coach hints.
        </p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <TacticBoard
          key={`${current.id}-${boardKey}`}
          fen={current.fen}
          lines={current.lines}
          mateAny={current.mateAny}
          onSolved={(moves) => void report(current, "solved", moves)}
          onFailed={(moves) => void report(current, "failed", moves)}
        />

        <aside className="w-full max-w-[600px] space-y-4 lg:w-80">
          <div className="rounded-lg border p-4" style={{ ...borderStyle, background: "var(--surface)" }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {current.difficulty} · {current.theme}
            </p>
            <h2 className="mt-1 font-semibold">{current.title}</h2>
            <p className="mt-1 text-sm">Goal: {current.goal}</p>
            <SpeakButton
              className="mt-2"
              text={`${current.title}. Goal: ${current.goal}.${hintLevel >= 1 ? ` Hint: ${current.hint}.` : ""}${hintLevel >= 2 && aiHint ? ` ${aiHint}` : ""}`}
            />

            <div className="mt-3 space-y-2 text-sm">
              {hintLevel >= 1 && <p>Hint 1: {current.hint}</p>}
              {hintLevel >= 2 && (
                <p>{hintBusy ? "Coach is thinking…" : `Hint 2: ${aiHint ?? "Look at which piece can make the biggest threat."}`}</p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void showHint()}
                disabled={hintLevel === 2 || hintBusy}
                className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-40"
                style={borderStyle}
              >
                {hintLevel === 0 ? "Show hint" : "Stronger hint"}
              </button>
              <button
                type="button"
                onClick={() => select(current)}
                className="rounded-md border px-3 py-1.5 text-sm font-medium"
                style={borderStyle}
              >
                Restart
              </button>
              <button
                type="button"
                onClick={nextPuzzle}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-[color:var(--accent-fg)]"
                style={{ background: "var(--accent)" }}
              >
                Next puzzle
              </button>
            </div>
            {message && (
              <p role="alert" className="mt-2 text-sm text-red-500">
                {message}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className="rounded-md border px-2 py-1 text-xs font-medium"
                style={{
                  ...borderStyle,
                  background: filter === item.key ? "var(--accent)" : "transparent",
                  color: filter === item.key ? "var(--accent-fg)" : "inherit",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {visible.map((puzzle) => (
              <li key={puzzle.id}>
                <button
                  type="button"
                  onClick={() => select(puzzle)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm"
                  style={{
                    ...borderStyle,
                    background: puzzle.id === current.id ? "var(--surface)" : "transparent",
                    fontWeight: puzzle.id === current.id ? 600 : 400,
                  }}
                >
                  <span>{puzzle.title}</span>
                  {stats.solved.includes(puzzle.id) && <span style={{ color: "var(--accent)" }}>✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
