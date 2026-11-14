"use client";

import { useEffect } from "react";

/** Registers the service worker so the site can be installed as an app. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installing as an app is optional; ignore failures.
    });
  }, []);
  return null;
}
