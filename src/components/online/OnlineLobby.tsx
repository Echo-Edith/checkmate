"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { LobbyEntry } from "@/lib/db/online";

interface Lobby {
  open: LobbyEntry[];
  mine: LobbyEntry[];
  challenges: LobbyEntry[];
}

const colorName = (color: "w" | "b") => (color === "w" ? "White" : "Black");

function describe(entry: LobbyEntry): string {
  if (entry.status === "waiting") return "Waiting for an opponent";
  if (entry.status === "active") return `vs ${entry.opponentName ?? "?"}`;
  if (entry.result === "1/2-1/2") return `Draw vs ${entry.opponentName ?? "?"}`;
  const won = (entry.result === "1-0") === (entry.myColor === "w");
  return `${won ? "Victory" : "Defeat"} vs ${entry.opponentName ?? "?"}`;
}

export function OnlineLobby() {
  const router = useRouter();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [color, setColor] = useState<"random" | "w" | "b">("random");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/online/games", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setLobby((await response.json()) as Lobby);
    } catch {
      // Keep the last list. The next refresh will try again.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function start(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error ?? "Could not start the game.");
      router.push(`/online/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the game.");
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="card space-y-4 p-5">
        <button type="button" disabled={busy} onClick={() => void start("/api/online/quick")} className="btn-primary w-full rounded-xl px-5 py-4 text-left disabled:opacity-60">
          <span className="block text-lg font-semibold">Quick match</span>
          <span className="block text-sm opacity-80">Play the next person who is looking for a game</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Or create a game as</span>
          {(["random", "w", "b"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setColor(value)}
              aria-pressed={color === value}
              className="rounded-full border px-3 py-1.5 text-sm font-medium"
              style={{
                borderColor: color === value ? "var(--accent)" : "var(--border)",
                background: color === value ? "var(--accent)" : "transparent",
                color: color === value ? "var(--accent-fg)" : "inherit",
              }}
            >
              {value === "random" ? "Random" : colorName(value)}
            </button>
          ))}
          <button type="button" disabled={busy} onClick={() => void start("/api/online/games", { color })} className="rounded-full border px-4 py-1.5 text-sm font-semibold disabled:opacity-60" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
            Create
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}
      </section>

      {lobby && lobby.challenges.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Challenges from friends</h2>
          <ul className="space-y-2">
            {lobby.challenges.map((entry) => (
              <li key={entry.id}>
                <Link href={`/online/${entry.id}`} className="card card-hover flex items-center justify-between gap-3 px-4 py-3" style={{ borderColor: "var(--accent)" }}>
                  <span className="min-w-0 truncate font-medium">{entry.creatorName} challenged you</span>
                  <span className="btn-primary rounded-lg px-4 py-1.5 text-sm font-semibold">Accept</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Open games</h2>
        {!lobby ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Loading…
          </p>
        ) : lobby.open.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Nobody is waiting. Make a game and share the link, or tap Quick match.
          </p>
        ) : (
          <ul className="space-y-2">
            {lobby.open.map((entry) => (
              <li key={entry.id}>
                <Link href={`/online/${entry.id}`} className="card card-hover flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{entry.creatorName}</span>
                    <span className="block text-xs" style={{ color: "var(--muted)" }}>
                      Plays {colorName(entry.creatorColor)}
                    </span>
                  </span>
                  <span className="btn-primary rounded-lg px-4 py-1.5 text-sm font-semibold">Join</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lobby && lobby.mine.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Your games</h2>
          <ul className="space-y-2">
            {lobby.mine.map((entry) => (
              <li key={entry.id}>
                <Link href={`/online/${entry.id}`} className="card card-hover flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 truncate">{describe(entry)}</span>
                  <span className="shrink-0 text-xs font-medium" style={{ color: entry.status === "finished" ? "var(--muted)" : "var(--accent)" }}>
                    {entry.status === "finished" ? "Finished" : entry.status === "active" ? "Play →" : "Open →"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
