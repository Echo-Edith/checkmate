import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { requireUser } from "@/lib/auth";
import { LESSONS } from "@/lib/content/lessons";
import { PUZZLES } from "@/lib/content/puzzles";
import { listGames, type GameSummary } from "@/lib/db/games";
import { getOrCreateProfile } from "@/lib/db/profiles";
import { getProgress } from "@/lib/db/progress";

export const metadata: Metadata = { title: "Profile — Checkm8" };
export const dynamic = "force-dynamic";

function outcome(game: GameSummary): string {
  if (game.mode === "pvp") return "Two players";
  if (game.result === "1/2-1/2") return "Draw";
  const whiteWon = game.result === "1-0";
  return (whiteWon && game.color === "w") || (!whiteWon && game.color === "b") ? "Win" : "Loss";
}

export default async function ProfilePage() {
  const user = await requireUser();

  try {
    const [profile, progress, games] = await Promise.all([
      getOrCreateProfile(user.id, user.email),
      getProgress(user.id),
      listGames(user.id, 8),
    ]);

    const { puzzles } = progress;
    const accuracy = puzzles.attempts > 0 ? `${Math.round((puzzles.correct / puzzles.attempts) * 100)}%` : "—";
    const stats: Array<[string, string]> = [
      ["Games played", String(profile.stats.gamesPlayed)],
      ["Wins", String(profile.stats.gamesWon)],
      ["Losses", String(profile.stats.gamesLost)],
      ["Draws", String(profile.stats.draws)],
      ["Puzzle accuracy", accuracy],
      ["Best puzzle streak", String(puzzles.bestStreak)],
      ["Puzzles solved", `${puzzles.solved.length}/${PUZZLES.length}`],
      ["Lessons completed", `${progress.lessons.length}/${LESSONS.length}`],
    ];

    return (
      <main className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{profile.username}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {user.email}
          </p>
          {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}
        </header>

        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="mb-3 text-lg font-semibold">
            Statistics
          </h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <dt className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                  {label}
                </dt>
                <dd className="mt-1 text-xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="mb-3 text-lg font-semibold">
            Recent games
          </h2>
          {games.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No games yet.{" "}
              <Link href="/play" className="underline">
                Play your first game
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-1">
              {games.map((game) => (
                <li key={game.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--border)" }}>
                  <span>
                    {outcome(game)} · {Math.ceil(game.plies / 2)} moves
                    {game.resigned && " · resigned"}
                  </span>
                  <span style={{ color: "var(--muted)" }}>{new Date(game.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/analyze" className="mt-3 inline-block text-sm underline">
            Analyse a game →
          </Link>
        </section>

        <section aria-labelledby="settings-heading">
          <h2 id="settings-heading" className="mb-3 text-lg font-semibold">
            Settings
          </h2>
          <ProfileForm
            initial={{
              username: profile.username,
              bio: profile.bio,
              isPublic: profile.isPublic !== false,
              theme: profile.preferences.theme,
              boardTheme: profile.preferences.boardTheme,
              tutorPersonality: profile.preferences.tutorPersonality,
            }}
          />
        </section>
      </main>
    );
  } catch {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p role="alert" className="rounded-md border p-4 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          Could not load your profile. Check that MONGO_URI is set and that MongoDB Atlas allows connections from this server.
        </p>
      </main>
    );
  }
}
