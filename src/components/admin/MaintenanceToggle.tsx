"use client";

import { useEffect, useState } from "react";

export function MaintenanceToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/maintenance")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: { on: boolean }) => setOn(data.on))
      .catch(() => setError("Could not load the setting."));
  }, []);

  async function toggle() {
    if (on === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on: !on }),
      });
      if (!response.ok) throw new Error();
      setOn(!on);
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-4" aria-labelledby="maintenance-heading">
      <div className="min-w-0">
        <h2 id="maintenance-heading" className="font-semibold">
          Maintenance mode: {on === null ? "…" : on ? "ON" : "OFF"}
        </h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          When on, only Testers and the owner can use the site.
        </p>
        {error && (
          <p className="mt-1 text-sm" role="alert" style={{ color: "#ef4444" }}>
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={on === null || busy}
        aria-pressed={on === true}
        className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${on ? "border" : "btn-primary"}`}
        style={on ? { borderColor: "var(--border)" } : undefined}
      >
        {on ? "Turn off" : "Turn on"}
      </button>
    </section>
  );
}
