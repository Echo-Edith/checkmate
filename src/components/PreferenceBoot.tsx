"use client";

import { useEffect } from "react";
import { applyPreferences, loadPreferences } from "@/lib/preferences";

/** Applies the saved theme and board colours on every page load. Renders nothing. */
export function PreferenceBoot() {
  useEffect(() => {
    const saved = loadPreferences();
    if (saved) applyPreferences(saved);
  }, []);
  return null;
}
