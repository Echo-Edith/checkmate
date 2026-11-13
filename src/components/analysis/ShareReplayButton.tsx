"use client";

import { useState } from "react";

export function ShareReplayButton({ moves, loggedIn }: { moves: string[]; loggedIn: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function share() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moves }) });
      const data = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!response.ok || !data.id) throw new Error(data.error ?? "Could not make the link.");
      const url = `${window.location.origin}/replay/${data.id}`;
      // On a phone this opens the normal share sheet. Otherwise the link is copied.
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "Chess game replay", url });
          setMessage({ kind: "ok", text: "Link ready." });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        setMessage({ kind: "ok", text: "Link copied." });
      } catch {
        setMessage({ kind: "ok", text: url });
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not make the link." });
    } finally {
      setBusy(false);
    }
  }

  if (!loggedIn) {
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Log in to share this replay.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => void share()}
        disabled={busy}
        className="min-h-11 w-full rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
        style={{ borderColor: "var(--border)", touchAction: "manipulation" }}
      >
        {busy ? "Making link…" : "Share replay link"}
      </button>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className="break-all text-sm" style={{ color: message.kind === "error" ? "#ef4444" : "var(--accent)" }}>
          {message.text}
        </p>
      )}
    </div>
  );
}
