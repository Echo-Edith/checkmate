import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const FEATURES = [
  { href: "/play", icon: "♞", title: "Play", text: "Play the computer or a friend." },
  { href: "/puzzles", icon: "♜", title: "Puzzles", text: "Solve tactics with hints." },
  { href: "/lessons", icon: "♝", title: "Lessons", text: "Learn step by step." },
  { href: "/analyze", icon: "♛", title: "Analyse", text: "Find your mistakes." },
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

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <Image src="/logo.png" alt="" width={14} height={14} className="rounded-sm" style={{ background: "var(--accent)", padding: 1 }} />
            AI chess tutor
          </span>
          <h1 className="gradient-text mt-5 pb-1 text-4xl font-bold tracking-tight sm:text-6xl">Learn chess with a talking tutor.</h1>
          <p className="mt-5 max-w-xl text-lg" style={{ color: "var(--muted)" }}>
            Lessons, puzzles and a tutor that talks.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <Link href="/dashboard" className="btn-primary rounded-lg px-6 py-3 text-sm font-semibold">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary rounded-lg px-6 py-3 text-sm font-semibold">
                  Create free account
                </Link>
                <Link href="/play" className="card rounded-lg px-6 py-3 text-sm font-semibold">
                  Play now
                </Link>
              </>
            )}
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
              <h2 className="mt-4 font-semibold">{feature.title}</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                {feature.text}
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
