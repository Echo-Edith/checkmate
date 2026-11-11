"use client";

import Link from "next/link";
import { useState } from "react";

const LEVELS = [
  { label: "Beginner", value: 0 },
  { label: "Casual", value: 1 },
  { label: "Club", value: 2 },
  { label: "Strong", value: 3 },
  { label: "Maximum", value: 4 },
] as const;

const COLORS = [
  { label: "White", value: "w" },
  { label: "Black", value: "b" },
] as const;

type Panel = "none" | "play" | "bot";

const border = { borderColor: "var(--border)" } as const;

function chip(active: boolean) {
  return {
    borderColor: active ? "var(--accent)" : "var(--border)",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--accent-fg)" : "inherit",
  } as const;
}

/** The logged-in landing choices. Play opens a second step: bot or person. */
export function Hub({ nextLesson }: { nextLesson: { href: string; title: string } | null }) {
  const [panel, setPanel] = useState<Panel>("none");
  const [level, setLevel] = useState(1);
  const [color, setColor] = useState<"w" | "b">("w");

  const cards = [
    { href: "/puzzles", icon: "♜", title: "Puzzles", text: "Solve tactics." },
    { href: "/lessons", icon: "♝", title: "Lessons", text: "Learn step by step." },
    { href: "/analyze", icon: "♛", title: "Analyse", text: "Review a game." },
    { href: "/profile", icon: "♚", title: "Profile", text: "Themes and settings." },
  ];

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setPanel(panel === "none" ? "play" : "none")}
        aria-expanded={panel !== "none"}
        className="card card-hover flex w-full items-center gap-4 p-5 text-left"
      >
        <span className="btn-primary grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl">♞</span>
        <span className="flex-1">
          <span className="block text-xl font-semibold">Play</span>
          <span className="block text-sm" style={{ color: "var(--muted)" }}>
            A bot or a person
          </span>
        </span>
        <span aria-hidden className="text-xl" style={{ color: "var(--muted)" }}>
          {panel === "none" ? "›" : "⌄"}
        </span>
      </button>

      {panel !== "none" && (
        <div className="mascot-panel grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setPanel("bot")}
            aria-pressed={panel === "bot"}
            className="card card-hover p-5 text-left"
            style={panel === "bot" ? { borderColor: "var(--accent)" } : undefined}
          >
            <span className="text-2xl" aria-hidden>
              🤖
            </span>
            <span className="mt-2 block font-semibold">Play a bot</span>
            <span className="block text-sm" style={{ color: "var(--muted)" }}>
              Pick how strong it is.
            </span>
          </button>
          <Link href="/online" className="card card-hover block p-5">
            <span className="text-2xl" aria-hidden>
              🌍
            </span>
            <span className="mt-2 block font-semibold">Play online</span>
            <span className="block text-sm" style={{ color: "var(--muted)" }}>
              Other players on Checkm8.
            </span>
          </Link>
          <Link href="/play?mode=pvp" className="card card-hover block p-5">
            <span className="text-2xl" aria-hidden>
              👥
            </span>
            <span className="mt-2 block font-semibold">Same screen</span>
            <span className="block text-sm" style={{ color: "var(--muted)" }}>
              Two players, one device.
            </span>
          </Link>
        </div>
      )}

      {panel === "bot" && (
        <div className="card mascot-panel space-y-4 p-5">
          <div>
            <p className="text-sm font-medium">Bot level</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LEVELS.map((item) => (
                <button key={item.value} type="button" onClick={() => setLevel(item.value)} aria-pressed={level === item.value} className="rounded-full border px-3 py-1.5 text-sm font-medium" style={chip(level === item.value)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">You play</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((item) => (
                <button key={item.value} type="button" onClick={() => setColor(item.value)} aria-pressed={color === item.value} className="rounded-full border px-3 py-1.5 text-sm font-medium" style={chip(color === item.value)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <Link href={`/play?mode=computer&level=${level}&color=${color}`} className="btn-primary inline-block rounded-lg px-6 py-2.5 text-sm font-semibold">
            Start game
          </Link>
        </div>
      )}

      {nextLesson && (
        <Link href={nextLesson.href} className="btn-primary flex items-center justify-between gap-3 rounded-2xl px-5 py-4">
          <span>
            <span className="block text-xs font-medium opacity-80">Continue learning</span>
            <span className="block text-base font-semibold">{nextLesson.title}</span>
          </span>
          <span aria-hidden className="text-2xl">
            →
          </span>
        </Link>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <li key={card.href}>
            <Link href={card.href} className="card card-hover block h-full p-4" style={border}>
              <span className="grid h-10 w-10 place-items-center rounded-xl text-xl" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }}>
                {card.icon}
              </span>
              <span className="mt-3 block font-semibold">{card.title}</span>
              <span className="block text-sm" style={{ color: "var(--muted)" }}>
                {card.text}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
