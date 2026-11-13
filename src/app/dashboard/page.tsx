import { Hub } from "@/components/dashboard/Hub";
import { getT } from "@/lib/i18n/server";
import { requireUser } from "@/lib/auth";
import { LESSONS } from "@/lib/content/lessons";
import { getOrCreateProfile } from "@/lib/db/profiles";
import { getProgress } from "@/lib/db/progress";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getT();

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

  let nextLesson: { href: string; title: string } | null = null;
  try {
    const done = (await getProgress(user.id)).lessons;
    const lesson = LESSONS.find((item) => !done.includes(item.id));
    if (lesson) nextLesson = { href: `/lessons/${lesson.id}`, title: lesson.title };
  } catch {
    // The hub still works without progress.
  }

  const items: Array<[string, number]> = stats
    ? [
        [t("stat.games"), stats.gamesPlayed],
        [t("stat.wins"), stats.gamesWon],
        [t("stat.losses"), stats.gamesLost],
        [t("stat.draws"), stats.draws],
        [t("stat.puzzles"), stats.puzzlesSolved],
        [t("stat.lessons"), stats.lessonsCompleted],
      ]
    : [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("dash.welcome", { name: username })}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {t("dash.ask")}
          </p>
        </div>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="rounded-md border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)" }}
          >
            {t("nav.logout")}
          </button>
        </form>
      </header>

      <div className="mt-6">
        <Hub nextLesson={nextLesson} />
      </div>

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
