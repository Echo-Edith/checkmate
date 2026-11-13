"use client";

import { useEffect, useRef, useState } from "react";
import type { Chess, Square } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { playSound, soundForSan } from "@/lib/sounds";

export interface ReplayStep {
  san: string;
  from: Square;
  to: Square;
  color: "w" | "b";
  moveNumber: number;
}

const SPEEDS = [0.5, 1, 1.5, 2] as const;
/** Time between moves at 1x. */
const BASE_MS = 1100;
const noop = () => undefined;

interface ReplayPanelProps {
  /** Board after `selected` moves. */
  game: Chess;
  steps: readonly ReplayStep[];
  selected: number;
  onSelect: (index: number) => void;
}

function IconButton({ label, onClick, disabled, children, primary = false }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid h-12 min-w-12 flex-1 place-items-center rounded-xl border text-xl font-semibold disabled:opacity-40 sm:h-11 sm:min-w-11 sm:flex-none sm:px-4 ${primary ? "btn-primary" : ""}`}
      style={{ borderColor: primary ? "transparent" : "var(--border)", touchAction: "manipulation" }}
    >
      {children}
    </button>
  );
}

/**
 * Video-style replay of a game. Positions come from chess.js, so every frame is a legal position.
 * Play / pause, previous, next, restart, a draggable timeline and four speeds. It pauses itself at the end.
 */
export function ReplayPanel({ game, steps, selected, onSelect }: ReplayPanelProps) {
  const total = steps.length;
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const atEnd = selected >= total;

  // Pieces only slide when we move forward by exactly one move (not when the timeline jumps).
  const previous = useRef(selected);
  const animate = selected === previous.current + 1;
  useEffect(() => {
    previous.current = selected;
  }, [selected]);

  // The "clock": one move per tick, and a stop at the end.
  useEffect(() => {
    if (!playing) return;
    if (selected >= total) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => {
      const next = selected + 1;
      const step = steps[next - 1];
      if (step) playSound(soundForSan(step.san));
      onSelect(next);
    }, BASE_MS / speed);
    return () => window.clearTimeout(timer);
  }, [playing, selected, speed, total, steps, onSelect]);

  function togglePlay() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (atEnd) onSelect(0);
    setPlaying(true);
  }

  const step = selected > 0 ? steps[selected - 1] : undefined;
  const lastMove = step ? { from: step.from, to: step.to } : null;
  const percent = total > 0 ? (selected / total) * 100 : 0;

  return (
    <div className="space-y-3">
      <ChessBoard game={game} orientation="w" interactive={false} lastMove={lastMove} onMove={noop} animate={animate} />

      <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }} role="group" aria-label="Replay controls">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span translate="no" className="min-w-0 truncate font-semibold">
            {step ? `${step.moveNumber}${step.color === "w" ? "." : "..."} ${step.san}` : "Start"}
          </span>
          <span className="shrink-0" style={{ color: "var(--muted)" }}>
            Move {Math.ceil(selected / 2)} of {Math.ceil(total / 2)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={total}
          step={1}
          value={selected}
          onPointerDown={() => setPlaying(false)}
          onChange={(event) => onSelect(Number(event.target.value))}
          aria-label="Timeline"
          aria-valuetext={step ? `Move ${step.moveNumber}, ${step.san}` : "Start"}
          className="replay-range w-full"
          style={{ ["--fill" as string]: `${percent}%` }}
        />

        <div className="flex items-stretch justify-center gap-2">
          <IconButton label="Restart" onClick={() => { setPlaying(false); onSelect(0); }} disabled={selected === 0 && !playing}>
            ⏮
          </IconButton>
          <IconButton label="Previous move" onClick={() => { setPlaying(false); onSelect(Math.max(0, selected - 1)); }} disabled={selected === 0}>
            ‹
          </IconButton>
          <IconButton label={playing ? "Pause" : atEnd ? "Replay" : "Play"} onClick={togglePlay} disabled={total === 0} primary>
            {playing ? "❚❚" : "▶"}
          </IconButton>
          <IconButton label="Next move" onClick={() => { setPlaying(false); onSelect(Math.min(total, selected + 1)); }} disabled={atEnd}>
            ›
          </IconButton>
        </div>

        <div className="flex items-center justify-center gap-1.5" role="group" aria-label="Playback speed">
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpeed(value)}
              aria-pressed={speed === value}
              className="h-10 min-w-14 flex-1 rounded-lg border text-sm font-semibold sm:flex-none sm:px-3"
              style={{
                borderColor: speed === value ? "var(--accent)" : "var(--border)",
                background: speed === value ? "var(--accent)" : "transparent",
                color: speed === value ? "var(--accent-fg)" : "inherit",
                touchAction: "manipulation",
              }}
            >
              {value}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
