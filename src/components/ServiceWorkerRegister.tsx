"use client";

import { useEffect, useState } from "react";

/** Registers the service worker and offers a one-tap update when a new version is ready. */
export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let cancelled = false;
    let reloading = false;

    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const watch = (registration: ServiceWorkerRegistration) => {
      const check = () => {
        if (registration.waiting && navigator.serviceWorker.controller && !cancelled) setWaiting(registration.waiting);
      };
      check();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed") check();
        });
      });
    };

    let registration: ServiceWorkerRegistration | null = null;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        registration = reg;
        watch(reg);
      })
      .catch(() => {
        // Installing as an app is optional; ignore failures.
      });

    // Look for a new version when the app comes back to the front.
    const onVisible = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!waiting) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-4 flex max-w-sm items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg"
      style={{ borderColor: "var(--border)", background: "var(--surface)", marginBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <span>A new version of Checkm8 is ready.</span>
      <button
        type="button"
        className="btn-primary rounded-md px-3 py-1.5 text-xs font-semibold"
        onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}
      >
        Update
      </button>
    </div>
  );
}
