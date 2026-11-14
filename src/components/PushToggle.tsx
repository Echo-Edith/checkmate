"use client";

import { useEffect, useState } from "react";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type State = "loading" | "unsupported" | "blocked" | "off" | "on";

/** Turns notifications for challenges and "your move" on or off for this device. */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!PUBLIC_KEY || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("blocked");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(PUBLIC_KEY) });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!response.ok) {
        await sub.unsubscribe().catch(() => undefined);
        throw new Error("save failed");
      }
      setState("on");
    } catch {
      setMessage("Could not turn on notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setMessage("Could not turn off notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;
  return (
    <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <h2 className="text-base font-semibold">Notifications</h2>
      {state === "unsupported" ? (
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          This device or browser cannot show notifications. On iPhone, add Checkm8 to your Home Screen first, then open it from there.
        </p>
      ) : state === "blocked" ? (
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Notifications are blocked. Allow them in your browser or phone settings, then come back.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Get a message when a friend challenges you, joins your game, or it is your move.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={state === "on" ? turnOff : turnOn}
            className="btn-primary mt-3 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {state === "on" ? "Turn off notifications" : "Turn on notifications"}
          </button>
        </>
      )}
      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
