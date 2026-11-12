import type { Metadata } from "next";
import Link from "next/link";
import { Badges } from "@/components/Badges";
import { Avatar } from "@/components/Avatar";
import { listPublicPlayers, type PublicPlayer } from "@/lib/db/public";

export const metadata: Metadata = { title: "Players — Checkm8" };
export const dynamic = "force-dynamic";


export default async function PlayersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const search = (q ?? "").trim().slice(0, 30);

  let players: PublicPlayer[] = [];
  let failed = false;
  try {
    players = await listPublicPlayers({ search, limit: 50 });
  } catch {
    failed = true;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Ranked by Elo rating. Everyone starts at 1200. A ? means only a few games so far.
      </p>

      <form action="/players" className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={search}
          maxLength={30}
          placeholder="Search a username…"
          aria-label="Search players"
          className="min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm"
          style={{ borderColor: "var(--border)" }}
        />
        <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">
          Search
        </button>
      </form>

      {failed ? (
        <p role="alert" className="mt-6 text-sm text-red-500">
          Could not load players right now.
        </p>
      ) : players.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
          No players found.
        </p>
      ) : (
        <ol className="mt-6 space-y-2">
          {players.map((player) => (
            <li key={player.id}>
              <Link href={`/players/${player.id}`} className="card card-hover flex items-center gap-3 px-4 py-3">
                <span className="w-9 shrink-0 text-center text-lg font-semibold">{player.rank > 0 ? `#${player.rank}` : "–"}</span>
                <Avatar id={player.id} version={player.avatarVersion} name={player.username} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{player.username}</span>
                    <Badges badges={player.badges} compact />
                  </span>
                  <span className="block text-xs" style={{ color: "var(--muted)" }}>
                    {player.stats.gamesWon}W {player.stats.gamesLost}L {player.stats.draws}D · {player.stats.puzzlesSolved} puzzles
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-lg font-semibold" style={{ color: "var(--accent)" }}>
                    {player.rank > 0 ? `${player.rating}${player.ratedGames < 5 ? "?" : ""}` : "—"}
                  </span>
                  <span className="block text-xs" style={{ color: "var(--muted)" }}>
                    {player.rank > 0 ? "rating" : "unrated"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
