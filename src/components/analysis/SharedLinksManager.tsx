"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface MyLink {
  id: string;
  moves: number;
  createdAt: string;
}

/** The replay links this player made, with a button to delete each one. */
export function SharedLinksManager() {
  const [links, setLinks] = useState<MyLink[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/share");
      const data = (await response.json().catch(() => ({}))) as { links?: MyLink[] };
      if (response.ok && data.links) setLinks(data.links);
    } catch {
      // The list is only a convenience.
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("checkm8:shares-changed", refresh);
    return () => window.removeEventListener("checkm8:shares-changed", refresh);
  }, [load]);

  async function copy(id: string) {
    const url = `${window.location.origin}/replay/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ kind: "ok", text: "Link copied." });
    } catch {
      setMessage({ kind: "ok", text: url });
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/share?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not delete the link.");
      setLinks((list) => (list ? list.filter((item) => item.id !== id) : list));
      setMessage({ kind: "ok", text: "Link deleted. It no longer works." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not delete the link." });
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  if (!links || links.length === 0) return null;

  return (
    <section className="card p-4" aria-labelledby="shared-links-heading">
      <h2 id="shared-links-heading" className="font-semibold">
        Your shared links
      </h2>
      <ul className="mt-3 space-y-2">
        {links.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-sm" style={{ borderColor: "var(--border)" }}>
            <Link href={`/replay/${item.id}`} className="min-w-0 truncate underline" translate="no">
              /replay/{item.id}
            </Link>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {Math.ceil(item.moves / 2)} moves, {new Date(item.createdAt).toLocaleDateString()}
            </span>
            <span className="flex gap-2">
              <button type="button" onClick={() => void copy(item.id)} className="min-h-9 rounded-md border px-3 text-xs font-medium" style={{ borderColor: "var(--border)", touchAction: "manipulation" }}>
                Copy
              </button>
              {confirmId === item.id ? (
                <>
                  <button type="button" onClick={() => void remove(item.id)} disabled={busyId === item.id} className="min-h-9 rounded-md px-3 text-xs font-semibold disabled:opacity-50" style={{ background: "#ef4444", color: "#fff", touchAction: "manipulation" }}>
                    {busyId === item.id ? "Deleting…" : "Yes, delete"}
                  </button>
                  <button type="button" onClick={() => setConfirmId(null)} className="min-h-9 rounded-md border px-3 text-xs font-medium" style={{ borderColor: "var(--border)", touchAction: "manipulation" }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmId(item.id)} className="min-h-9 rounded-md border px-3 text-xs font-medium" style={{ borderColor: "var(--border)", color: "#ef4444", touchAction: "manipulation" }}>
                  Delete link
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className="mt-2 break-all text-sm" style={{ color: message.kind === "error" ? "#ef4444" : "var(--accent)" }}>
          {message.text}
        </p>
      )}
    </section>
  );
}
