"use client";

import { useEffect, useState } from "react";

const CHECK_EVERY_MS = 60_000;

/**
 * Registers the service worker and applies new versions of the site straight away.
 * The page refreshes itself as soon as a new version is live, except in the middle of a local
 * game (so no game is ever lost). Then it waits and refreshes when the game ends.
 */
export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    // On the very first visit there is no old version to replace, so nothing needs a refresh.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    let timer: number | undefined;

    const isBusy = () => document.documentElement.dataset.busy === "1";
    const reloadNow = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    const applyWhenSafe = () => {
      if (!isBusy()) {
        reloadNow();
        return;
      }
      setWaiting(true);
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        if (!isBusy()) reloadNow();
      }, 2000);
    };

    const onControllerChange = () => {
      if (hadController) applyWhenSafe();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let registration: ServiceWorkerRegistration | null = null;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
      })
      .catch(() => {
        // Installing as an app is optional; ignore failures.
      });

    // Look for a new version often, and whenever the app comes back to the front.
    const check = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => undefined);
    };
    const poll = window.setInterval(check, CHECK_EVERY_MS);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("online", check);
      window.clearInterval(poll);
      window.clearInterval(timer);
    };
  }, []);

  if (!waiting) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-4 flex max-w-sm items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg"
      style={{ borderColor: "var(--border)", background: "var(--surface)", marginBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <span>A new version is ready. It will refresh when your game ends.</span>
      <button type="button" className="btn-primary rounded-md px-3 py-1.5 text-xs font-semibold" onClick={() => window.location.reload()}>
        Refresh now
      </button>
    </div>
  );
}
