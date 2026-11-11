import { requireUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/db/profiles";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  let username = "Player";
  let stats: Awaited<ReturnType<typeof getOrCreateProfile>>["stats"] | null = null;
  let dbError = false;

  try {
    const profile = await getOrCreateProfile(user.id, user.email);
    username = profile.username;
    stats = profile.stats;
  } catch {
    dbError = true;
  }

  const items: Array<[string, number]> = stats
    ? [
        ["Games played", stats.gamesPlayed],
        ["Wins", stats.gamesWon],
        ["Losses", stats.gamesLost],
        ["Draws", stats.draws],
        ["Puzzles solved", stats.puzzlesSolved],
        ["Lessons completed", stats.lessonsCompleted],
      ]
    : [];

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {username}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {user.email}
          </p>
        </div>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-md border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)" }}
          >
            Log out
          </button>
        </form>
      </header>

      {dbError ? (
        <p
          role="alert"
          className="mt-8 rounded-md border p-4 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          Could not reach the database. Check that MONGO_URI is set correctly and that your Atlas
          Network Access list allows connections from Vercel (0.0.0.0/0).
        </p>
      ) : (
        <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border p-4"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
