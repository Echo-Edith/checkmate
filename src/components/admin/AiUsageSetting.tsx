"use client";

import { useEffect, useState, type FormEvent } from "react";

interface State {
  limit: number | null;
  used: { messages: number; players: number };
}

export function AiUsageSetting() {
  const [state, setState] = useState<State | null>(null);
  const [unlimited, setUnlimited] = useState(true);
  const [amount, setAmount] = useState("20");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function show(data: State) {
    setState(data);
    setUnlimited(data.limit === null);
    if (data.limit !== null) setAmount(String(data.limit));
  }

  useEffect(() => {
    fetch("/api/admin/ai-usage")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: State) => show(data))
      .catch(() => setMessage({ kind: "error", text: "Could not load the setting." }));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const limit = unlimited ? null : Number(amount);
    if (limit !== null && (!Number.isInteger(limit) || limit < 0 || limit > 10000)) {
      setMessage({ kind: "error", text: "Enter a whole number from 0 to 10000." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/ai-usage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit }) });
      const data = (await response.json().catch(() => ({}))) as State & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not save.");
      show(data);
      setMessage({ kind: "ok", text: "Saved." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-6 p-4" aria-labelledby="ai-usage-heading">
      <h2 id="ai-usage-heading" className="font-semibold">
        Free AI usage
      </h2>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        How many AI tutor messages each player gets for free per day. Testers and you are never limited.
      </p>
      <form onSubmit={(event) => void save(event)} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={unlimited} onChange={(event) => setUnlimited(event.target.checked)} className="h-4 w-4" />
          Unlimited
        </label>
        <label className="text-sm font-medium">
          Messages per day
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={10000}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={unlimited}
            className="mt-1 block w-32 rounded-md border bg-transparent px-3 py-2 text-sm disabled:opacity-40"
            style={{ borderColor: "var(--border)" }}
          />
        </label>
        <button type="submit" disabled={busy || state === null} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
      {state && (
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          Today: {state.used.messages} AI messages from {state.used.players} players.
        </p>
      )}
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className="mt-2 text-sm" style={{ color: message.kind === "error" ? "#ef4444" : "var(--accent)" }}>
          {message.text}
        </p>
      )}
    </section>
  );
}
