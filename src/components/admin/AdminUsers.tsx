"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Badges } from "@/components/Badges";
import { badgesFor } from "@/lib/badges";
import type { AdminUser } from "@/lib/db/admin";

interface Listing {
  users: AdminUser[];
  betaCount: number;
  total: number;
}

export function AdminUsers() {
  const [query, setQuery] = useState("");
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (search: string) => {
    try {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}`);
      if (!response.ok) throw new Error("Could not load users.");
      setListing((await response.json()) as Listing);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load users.");
    }
  }, []);

  // Search as you type, after a short pause.
  useEffect(() => {
    const timer = window.setTimeout(() => void load(query), 250);
    return () => window.clearTimeout(timer);
  }, [query, load]);

  async function toggleBeta(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    try {
      const response = await fetch("/api/admin/beta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, beta: !user.isBeta }),
      });
      if (!response.ok) throw new Error("Could not update that player.");
      setListing((current) =>
        current
          ? {
              ...current,
              betaCount: current.betaCount + (user.isBeta ? -1 : 1),
              users: current.users.map((item) => (item.id === user.id ? { ...item, isBeta: !user.isBeta } : item)),
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update that player.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-5">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        maxLength={30}
        placeholder="Search a username…"
        aria-label="Search players"
        className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
        style={{ borderColor: "var(--border)" }}
      />

      {listing && (
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          {listing.total} players · {listing.betaCount} beta testers
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {listing?.users.map((user) => (
          <li key={user.id} className="card flex items-center gap-3 px-3 py-2.5">
            <Avatar id={user.id} version={user.avatarVersion} name={user.username} size={40} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium">{user.username}</span>
                <Badges badges={badgesFor({ isOwner: user.isOwner, isBeta: user.isBeta })} compact />
              </span>
              <span className="block text-xs" style={{ color: "var(--muted)" }}>
                Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                {!user.isPublic && " · private profile"}
              </span>
            </span>
            <button
              type="button"
              disabled={busyId === user.id}
              onClick={() => void toggleBeta(user)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${user.isBeta ? "border" : "btn-primary"}`}
              style={user.isBeta ? { borderColor: "var(--border)" } : undefined}
            >
              {user.isBeta ? "Remove beta" : "Make beta tester"}
            </button>
          </li>
        ))}
      </ul>
      {listing && listing.users.length === 0 && (
        <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
          No players found.
        </p>
      )}
    </div>
  );
}
