import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const FEATURES = [
  { href: "/play", title: "Play", text: "Play against Stockfish at five levels, or with a friend on one board." },
  { href: "/puzzles", title: "Puzzles", text: "Solve tactics with hints, streaks and accuracy tracking." },
  { href: "/lessons", title: "Lessons", text: "Learn step by step, from the first move to endgames." },
  { href: "/analyze", title: "Analyse", text: "Find your mistakes and missed chances, move by move." },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Learn chess with an AI tutor</h1>
      <p className="mt-4 max-w-2xl text-lg" style={{ color: "var(--muted)" }}>
        Lessons, puzzles, game analysis and a tutor that explains ideas in plain language. The engine checks the facts,
        and the tutor explains them.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {user ? (
          <Link href="/dashboard" className="rounded-md px-5 py-2.5 text-sm font-medium text-white" style={{ background: "var(--accent)" }}>
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link href="/register" className="rounded-md px-5 py-2.5 text-sm font-medium text-white" style={{ background: "var(--accent)" }}>
              Create free account
            </Link>
            <Link href="/play" className="rounded-md border px-5 py-2.5 text-sm font-medium" style={{ borderColor: "var(--border)" }}>
              Play now
            </Link>
          </>
        )}
      </div>

      <ul className="mt-14 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <li key={feature.href}>
            <Link
              href={feature.href}
              className="block h-full rounded-lg border p-5 hover:opacity-90"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <h2 className="font-semibold">{feature.title}</h2>
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
