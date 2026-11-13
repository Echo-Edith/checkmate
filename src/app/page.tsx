import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DiscordButton } from "@/components/DiscordButton";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";

const FEATURES: Array<{ href: string; icon: string; title: MessageKey; text: MessageKey }> = [
  { href: "/play", icon: "♞", title: "nav.play", text: "feat.play" },
  { href: "/puzzles", icon: "♜", title: "nav.puzzles", text: "feat.puzzles" },
  { href: "/lessons", icon: "♝", title: "nav.lessons", text: "feat.lessons" },
  { href: "/analyze", icon: "♛", title: "nav.analyse", text: "feat.analyse" },
];

/** Decorative board: a few squares with big pieces, pure CSS so it costs nothing to load. */
function HeroBoard() {
  const pieces: Record<number, string> = { 1: "♚", 10: "♞", 19: "♟", 28: "♜", 37: "♛", 46: "♝", 55: "♙", 60: "♘" };
  return (
    <div
      className="float-slow grid aspect-square w-full max-w-[22rem] grid-cols-8 grid-rows-8 overflow-hidden rounded-2xl border shadow-2xl"
      style={{ borderColor: "var(--border)", ["--r" as string]: "3deg", transform: "rotate(3deg)" }}
      aria-hidden
    >
      {Array.from({ length: 64 }, (_, i) => {
        const dark = (Math.floor(i / 8) + (i % 8)) % 2 === 1;
        return (
          <div
            key={i}
            className="flex items-center justify-center text-[1.6rem] leading-none"
            style={{ background: dark ? "var(--sq-dark, #769656)" : "var(--sq-light, #eeeed2)", color: i < 32 ? "#1a1a1a" : "#fff", textShadow: i < 32 ? "none" : "0 1px 2px rgba(0,0,0,.6)" }}
          >
            {pieces[i] ?? ""}
          </div>
        );
      })}
    </div>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const t = await getT();

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <Image src="/logo.png" alt="" width={14} height={14} className="rounded-sm" style={{ background: "var(--accent)", padding: 1 }} />
            {t("land.badge")}
          </span>
          <h1 className="gradient-text mt-5 pb-1 text-4xl font-bold tracking-tight sm:text-6xl">{t("land.title")}</h1>
          <p className="mt-5 max-w-xl text-lg" style={{ color: "var(--muted)" }}>
            {t("land.sub")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link href="/dashboard" className="btn-primary rounded-lg px-6 py-3 text-sm font-semibold">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary rounded-lg px-6 py-3 text-sm font-semibold">
                  {t("land.create")}
                </Link>
                <Link href="/play" className="card rounded-lg px-6 py-3 text-sm font-semibold">
                  {t("land.playNow")}
                </Link>
              </>
            )}
            <DiscordButton />
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <HeroBoard />
        </div>
      </section>

      <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <li key={feature.href}>
            <Link href={feature.href} className="card card-hover block h-full p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }}>
                {feature.icon}
              </span>
              <h2 className="mt-4 font-semibold">{t(feature.title)}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                {t(feature.text)}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-xs" style={{ color: "var(--muted)" }}>
        Chess engine: Stockfish, licensed under the GNU GPL v3. See the notice in /stockfish/NOTICE.md.
      </p>
    </main>
  );
}
