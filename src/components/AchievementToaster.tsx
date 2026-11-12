"use client";

import { useCallback, useEffect, useState } from "react";
import type { Achievement } from "@/lib/achievements";
import { playSound } from "@/lib/sounds";

/** Pops up "Achievement unlocked!" cards. It checks every 30 seconds, and right after games, puzzles and lessons. */
export function AchievementToaster() {
  const [toasts, setToasts] = useState<Array<Achievement & { key: number }>>([]);

  const check = useCallback(async () => {
    if (document.hidden) return;
    try {
      const response = await fetch("/api/achievements", { cache: "no-store" });
      if (!response.ok) return;
      const { unlocked } = (await response.json()) as { unlocked: Achievement[] };
      if (unlocked.length === 0) return;
      const stamp = Date.now();
      setToasts((current) => [...current, ...unlocked.map((item, index) => ({ ...item, key: stamp + index }))]);
      playSound("win");
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.key < stamp)), 7000);
    } catch {
      // Try again at the next check.
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void check(), 2500);
    const timer = window.setInterval(() => void check(), 30_000);
    // Games, puzzles and lessons announce themselves with this event.
    const onEvent = () => window.setTimeout(() => void check(), 800);
    window.addEventListener("checkm8:check-achievements", onEvent);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      window.removeEventListener("checkm8:check-achievements", onEvent);
    };
  }, [check]);

  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.key} className="mascot-panel pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border p-3 shadow-2xl" style={{ borderColor: "var(--accent)", background: "var(--background)" }}>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} aria-hidden>
            {toast.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
              Achievement unlocked!
            </span>
            <span className="block font-semibold">{toast.name}</span>
            <span className="block text-sm" style={{ color: "var(--muted)" }}>
              {toast.text}
            </span>
          </span>
          <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.key !== toast.key))} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full text-lg leading-none" style={{ color: "var(--muted)" }}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
