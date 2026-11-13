"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { ReplayPanel, type ReplayStep } from "@/components/analysis/ReplayPanel";

/** A shared game: the same video-style replay, without the engine or the AI. */
export function SharedReplay({ moves }: { moves: string[] }) {
  const [selected, setSelected] = useState(0);

  const steps = useMemo<ReplayStep[]>(() => {
    const game = new Chess();
    const list: ReplayStep[] = [];
    try {
      for (const [index, san] of moves.entries()) {
        const made = game.move(san);
        list.push({ san: made.san, from: made.from, to: made.to, color: made.color, moveNumber: Math.floor(index / 2) + 1 });
      }
    } catch {
      // Show the moves that can be played.
    }
    return list;
  }, [moves]);

  const board = useMemo(() => {
    const game = new Chess();
    for (const step of steps.slice(0, selected)) game.move(step.san);
    return game;
  }, [steps, selected]);

  return (
    <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
      <div className="w-full min-w-0 max-w-[600px]">
        <ReplayPanel game={board} steps={steps} selected={selected} onSelect={setSelected} />
      </div>
      <div className="w-full min-w-0 max-w-[600px] space-y-4 lg:w-80">
        <ol className="max-h-96 space-y-0.5 overflow-y-auto rounded-lg border p-2 text-sm" style={{ borderColor: "var(--border)" }} translate="no">
          {steps.map((item, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => setSelected(index + 1)}
                className="flex min-h-9 w-full items-center rounded px-2 py-1 text-left"
                style={{ background: selected === index + 1 ? "var(--surface)" : "transparent", fontWeight: selected === index + 1 ? 600 : 400 }}
              >
                {item.moveNumber}
                {item.color === "w" ? "." : "..."} {item.san}
              </button>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap gap-2">
          <Link href="/analyze" className="btn-primary min-h-11 flex-1 rounded-xl px-4 py-3 text-center text-sm font-semibold">
            Analyse your own game
          </Link>
          <Link href="/register" className="min-h-11 flex-1 rounded-xl border px-4 py-3 text-center text-sm font-semibold" style={{ borderColor: "var(--border)" }}>
            Join Checkm8
          </Link>
        </div>
      </div>
    </div>
  );
}
