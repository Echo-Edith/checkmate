"use client";

import { useEffect, useState } from "react";

type Status = "loading" | "guest" | "self" | "none" | "friends" | "incoming" | "outgoing";

/** Add-friend button for a player's page. Hidden for guests and for your own page. */
export function FriendButton({ playerId }: { playerId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/friends/status?id=${playerId}`, { cache: "no-store" })
      .then((response) => response.json() as Promise<{ status: Status }>)
      .then((data) => active && setStatus(data.status))
      .catch(() => active && setStatus("none"));
    return () => {
      active = false;
    };
  }, [playerId]);

  async function act(action: "request" | "accept" | "decline" | "remove", next: Status) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id: playerId }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; result?: string };
      if (!response.ok) throw new Error(data.error ?? "Something went wrong.");
      setStatus(action === "request" && data.result === "accepted" ? "friends" : next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "guest" || status === "self") return null;

  const border = { borderColor: "var(--border)" } as const;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "none" && (
        <button type="button" disabled={busy} onClick={() => void act("request", "outgoing")} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">
          Add friend
        </button>
      )}
      {status === "outgoing" && (
        <button type="button" disabled={busy} onClick={() => void act("decline", "none")} className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60" style={border}>
          Request sent · Cancel
        </button>
      )}
      {status === "incoming" && (
        <>
          <button type="button" disabled={busy} onClick={() => void act("accept", "friends")} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60">
            Accept friend request
          </button>
          <button type="button" disabled={busy} onClick={() => void act("decline", "none")} className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-60" style={border}>
            Decline
          </button>
        </>
      )}
      {status === "friends" && (
        <>
          <span className="rounded-full px-3 py-1.5 text-sm font-medium" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)" }}>
            Friends
          </span>
          <button type="button" disabled={busy} onClick={() => void act("remove", "none")} className="rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-60" style={border}>
            Remove
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
