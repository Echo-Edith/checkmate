import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badges } from "@/components/Badges";
import { Avatar } from "@/components/Avatar";
import { getPublicPlayer } from "@/lib/db/public";

export const dynamic = "force-dynamic";

interface PlayerPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PlayerPageProps): Promise<Metadata> {
  const { id } = await params;
  const player = await getPublicPlayer(id).catch(() => null);
  return { title: player ? `${player.username} — Checkm8` : "Player — Checkm8" };
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params;
  const player = await getPublicPlayer(id).catch(() => null);
  if (!player) notFound();

  const { stats } = player;
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : null;
  const accuracy = stats.puzzlesAttempted > 0 ? Math.round((stats.puzzlesSolved / stats.puzzlesAttempted) * 100) : null;

  const items: Array<[string, string | number]> = [
    ["Games", stats.gamesPlayed],
    ["Wins", stats.gamesWon],
    ["Losses", stats.gamesLost],
    ["Draws", stats.draws],
    ["Win rate", winRate === null ? "—" : `${winRate}%`],
    ["Puzzles solved", stats.puzzlesSolved],
    ["Puzzle accuracy", accuracy === null ? "—" : `${accuracy}%`],
    ["Lessons done", stats.lessonsCompleted],
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/players" className="text-sm underline" style={{ color: "var(--muted)" }}>
        ← All players
      </Link>

      <header className="card mt-4 flex items-center gap-4 p-5">
        <Avatar id={player.id} version={player.avatarVersion} name={player.username} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{player.username}</h1>
          {player.badges.length > 0 && (
            <div className="mt-1">
              <Badges badges={player.badges} />
            </div>
          )}
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Joined {new Date(player.createdAt).toLocaleDateString("en", { year: "numeric", month: "short" })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold" style={{ color: "var(--accent)" }}>
            #{player.rank}
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {player.score} score
          </p>
        </div>
      </header>

      {player.bio && <p className="mt-4 whitespace-pre-wrap leading-relaxed">{player.bio}</p>}

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(([label, value]) => (
          <div key={label} className="card p-3">
            <dt className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              {label}
            </dt>
            <dd className="mt-1 text-xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
