import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Checkm8</h1>
      <p className="mt-4 text-lg" style={{ color: "var(--muted)" }}>
        Learn chess with lessons, puzzles, game analysis, and an AI tutor.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/play"
          className="rounded-md border px-5 py-2.5 text-sm font-medium"
          style={{ borderColor: "var(--border)" }}
        >
          Play chess
        </Link>
        {user ? (
          <Link
            href="/dashboard"
            className="rounded-md px-5 py-2.5 text-sm font-medium text-white"
            style={{ background: "var(--accent)" }}
          >
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link
              href="/register"
              className="rounded-md px-5 py-2.5 text-sm font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="rounded-md border px-5 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--border)" }}
            >
              Log in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
