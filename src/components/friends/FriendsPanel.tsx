"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Badges } from "@/components/Badges";
import { ChatBox } from "@/components/chat/ChatBox";
import type { BadgeId } from "@/lib/badges";
import type { Person } from "@/lib/db/friends";
import { playSound } from "@/lib/sounds";

interface Overview {
  friends: Person[];
  incoming: Person[];
  outgoing: Person[];
}

interface Found {
  id: string;
  username: string;
  avatarVersion: number | null;
  badges: BadgeId[];
}

const border = { borderColor: "var(--border)" } as const;
const smallButton = "rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50 pointer-coarse:py-2.5";

export function FriendsPanel() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [chatWith, setChatWith] = useState<string | null>(null);
  const incomingBefore = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/friends", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as Overview;
      if (incomingBefore.current !== null && data.incoming.length > incomingBefore.current) playSound("notify");
      incomingBefore.current = data.incoming.length;
      setOverview(data);
    } catch {
      // Keep the last list.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  // Search as you type, after a short pause.
  useEffect(() => {
    const text = query.trim();
    if (!text) {
      setFound([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/players?q=${encodeURIComponent(text)}`);
        if (!response.ok) return;
        setFound(((await response.json()) as { players: Found[] }).players);
      } catch {
        // Ignore. The next keystroke searches again.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function act(action: "request" | "accept" | "decline" | "remove", id: string, done?: string) {
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; result?: string };
      if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
      setMessage(action === "request" ? (data.result === "accepted" ? "You are now friends!" : "Request sent.") : (done ?? null));
      await refresh();
      window.dispatchEvent(new Event("checkm8:check-achievements"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function challenge(friend: Person) {
    setBusyId(friend.id);
    setMessage(null);
    try {
      const response = await fetch("/api/online/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: "random", friendId: friend.id }),
      });
      const data = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error ?? "Could not send the challenge.");
      router.push(`/online/${data.id}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not send the challenge.");
      setBusyId(null);
    }
  }

  const known = new Set([...(overview?.friends ?? []), ...(overview?.incoming ?? []), ...(overview?.outgoing ?? [])].map((p) => p.id));

  return (
    <div className="mt-6 space-y-8">
      <section aria-labelledby="find-heading">
        <h2 id="find-heading" className="mb-2 text-lg font-semibold">
          Find players
        </h2>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          maxLength={30}
          placeholder="Search a username…"
          aria-label="Search players"
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
          style={border}
        />
        {found.length > 0 && (
          <ul className="mt-3 space-y-2">
            {found.map((player) => (
              <li key={player.id} className="card flex items-center gap-3 px-3 py-2">
                <Avatar id={player.id} version={player.avatarVersion} name={player.username} size={36} />
                <Link href={`/players/${player.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {player.username}
                </Link>
                <Badges badges={player.badges} compact />
                {known.has(player.id) ? (
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    Added
                  </span>
                ) : (
                  <button type="button" disabled={busyId === player.id} onClick={() => void act("request", player.id)} className="btn-primary rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
                    Add
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {message && (
          <p role="status" className="mt-2 text-sm">
            {message}
          </p>
        )}
      </section>

      {overview && overview.incoming.length > 0 && (
        <section aria-labelledby="requests-heading">
          <h2 id="requests-heading" className="mb-2 text-lg font-semibold">
            Friend requests
          </h2>
          <ul className="space-y-2">
            {overview.incoming.map((person) => (
              <li key={person.id} className="card flex items-center gap-3 px-3 py-2">
                <Avatar id={person.id} version={person.avatarVersion} name={person.username} size={36} />
                <span className="min-w-0 flex-1 truncate font-medium">{person.username}</span>
                <button type="button" disabled={busyId === person.id} onClick={() => void act("accept", person.id, "Friend added!")} className="btn-primary rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
                  Accept
                </button>
                <button type="button" disabled={busyId === person.id} onClick={() => void act("decline", person.id)} className={smallButton} style={border}>
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="friends-heading">
        <h2 id="friends-heading" className="mb-2 text-lg font-semibold">
          Your friends {overview ? `(${overview.friends.length})` : ""}
        </h2>
        {!overview ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Loading…
          </p>
        ) : overview.friends.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No friends yet. Search a name above, or open a player from the Players page.
          </p>
        ) : (
          <ul className="space-y-2">
            {overview.friends.map((friend) => (
              <li key={friend.id} className="card px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar id={friend.id} version={friend.avatarVersion} name={friend.username} size={40} />
                  <Link href={`/players/${friend.id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {friend.username}
                  </Link>
                  <Badges badges={friend.badges} compact />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setChatWith(chatWith === friend.id ? null : friend.id)} aria-expanded={chatWith === friend.id} className={smallButton} style={border}>
                      Chat
                    </button>
                    <button type="button" disabled={busyId === friend.id} onClick={() => void challenge(friend)} className="btn-primary rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
                      Challenge
                    </button>
                    <button
                      type="button"
                      disabled={busyId === friend.id}
                      onClick={() => {
                        if (window.confirm(`Remove ${friend.username} from your friends?`)) void act("remove", friend.id, "Friend removed.");
                      }}
                      className={smallButton}
                      style={border}
                      aria-label={`Remove ${friend.username}`}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {chatWith === friend.id && (
                  <div className="mt-3">
                    <ChatBox scope="dm" target={friend.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {overview && overview.outgoing.length > 0 && (
        <section aria-labelledby="sent-heading">
          <h2 id="sent-heading" className="mb-2 text-sm font-semibold" style={{ color: "var(--muted)" }}>
            Requests you sent
          </h2>
          <ul className="space-y-2">
            {overview.outgoing.map((person) => (
              <li key={person.id} className="flex items-center gap-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{person.username}</span>
                <button type="button" disabled={busyId === person.id} onClick={() => void act("decline", person.id, "Request cancelled.")} className={smallButton} style={border}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
