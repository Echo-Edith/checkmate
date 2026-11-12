"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";

const LEVELS = [0, 1, 2, 3, 4] as const;
const COLORS = ["w", "b"] as const;

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
  const t = useT();
  const [panel, setPanel] = useState<Panel>("none");
  const [level, setLevel] = useState(1);
  const [color, setColor] = useState<"w" | "b">("w");

  const cards = [
    { href: "/puzzles", icon: "♜", title: t("nav.puzzles"), text: t("hub.puzzlesSub") },
    { href: "/lessons", icon: "♝", title: t("nav.lessons"), text: t("hub.lessonsSub") },
    { href: "/analyze", icon: "♛", title: t("nav.analyse"), text: t("hub.analyseSub") },
    { href: "/profile", icon: "♚", title: t("nav.profile"), text: t("hub.profileSub") },
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
          <span className="block text-xl font-semibold">{t("hub.play")}</span>
          <span className="block text-sm" style={{ color: "var(--muted)" }}>
            {t("hub.playSub")}
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
              ♞
            </span>
            <span className="mt-2 block font-semibold">{t("hub.bot")}</span>
            <span className="block text-sm" style={{ color: "var(--muted)" }}>
              {t("hub.botSub")}
            </span>
          </button>
          <Link href="/online" className="card card-hover block p-5">
            <span className="text-2xl" aria-hidden>
              ♜
            </span>
            <span className="mt-2 block font-semibold">{t("hub.online")}</span>
            <span className="block text-sm" style={{ color: "var(--muted)" }}>
              {t("hub.onlineSub")}
            </span>
          </Link>
          <Link href="/play?mode=pvp" className="card card-hover block p-5">
            <span className="text-2xl" aria-hidden>
              ♚
            </span>
            <span className="mt-2 block font-semibold">{t("hub.same")}</span>
            <span className="block text-sm" style={{ color: "var(--muted)" }}>
              {t("hub.sameSub")}
            </span>
          </Link>
        </div>
      )}

      {panel === "bot" && (
        <div className="card mascot-panel space-y-4 p-5">
          <div>
            <p className="text-sm font-medium">{t("hub.level")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LEVELS.map((item) => (
                <button key={item} type="button" onClick={() => setLevel(item)} aria-pressed={level === item} className="rounded-full border px-3 py-1.5 text-sm font-medium" style={chip(level === item)}>
                  {t(`level.${item}` as MessageKey)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">{t("hub.youPlay")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((item) => (
                <button key={item} type="button" onClick={() => setColor(item)} aria-pressed={color === item} className="rounded-full border px-3 py-1.5 text-sm font-medium" style={chip(color === item)}>
                  {t(`color.${item}` as MessageKey)}
                </button>
              ))}
            </div>
          </div>
          <Link href={`/play?mode=computer&level=${level}&color=${color}`} className="btn-primary inline-block rounded-lg px-6 py-2.5 text-sm font-semibold">
            {t("hub.start")}
          </Link>
        </div>
      )}

      {nextLesson && (
        <Link href={nextLesson.href} className="btn-primary flex items-center justify-between gap-3 rounded-2xl px-5 py-4">
          <span>
            <span className="block text-xs font-medium opacity-80">{t("hub.continue")}</span>
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
