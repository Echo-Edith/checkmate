"use client";

import { useCallback, useEffect, useState } from "react";

interface Row {
  id: string;
  at: string;
  source: string;
  status: number;
  summary: string;
  attempts: string[];
  userId?: string;
}

/** Owner-only list of recent AI failures with the detailed reason. Players only see a short message. */
export function AiErrorLog() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/ai-errors", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { errors: Row[] };
      setRows(data.errors);
    } catch {
      setMessage("Could not load the AI error log.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function clear() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/ai-errors", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setRows([]);
    } catch {
      setMessage("Could not clear the log.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }} translate="no">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">AI errors</h2>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={load} className="rounded-md border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "var(--border)" }}>
            Refresh
          </button>
          <button type="button" disabled={busy || !rows || rows.length === 0} onClick={clear} className="rounded-md border px-3 py-1.5 text-xs font-semibold disabled:opacity-50" style={{ borderColor: "var(--border)" }}>
            Clear
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        The AI is tried up to 3 times (with backup models) before it counts as an error. Players only see &quot;The AI didn&apos;t respond&quot;. The real reason is here. Entries are kept for 14 days.
      </p>
      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      )}
      {rows && rows.length === 0 && (
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          No AI errors.
        </p>
      )}
      {rows && rows.length > 0 && (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">{row.source}</span>
                <span style={{ color: "var(--muted)" }}>HTTP {row.status || "none"}</span>
                <span style={{ color: "var(--muted)" }}>{new Date(row.at).toLocaleString()}</span>
                {row.userId && <span style={{ color: "var(--muted)" }}>user {row.userId}</span>}
              </div>
              <p className="mt-1 break-words">{row.summary}</p>
              {row.attempts.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs" style={{ color: "var(--muted)" }}>
                    {row.attempts.length} {row.attempts.length === 1 ? "try" : "tries"}
                  </summary>
                  <ul className="mt-1 space-y-0.5 text-xs" style={{ color: "var(--muted)" }}>
                    {row.attempts.map((line, index) => (
                      <li key={index} className="break-words">
                        {line}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
