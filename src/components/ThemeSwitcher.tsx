"use client";

import { useEffect, useRef, useState } from "react";
import { applyPreferences, loadPreferences, savePreferences } from "@/lib/preferences";
import { SITE_THEMES, type SiteThemeId } from "@/lib/themes";

/** Small palette button in the navigation bar. Works for guests too (saved in this browser). */
export function ThemeSwitcher({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<SiteThemeId>("system");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadPreferences();
    if (saved?.theme) setCurrent(saved.theme);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(theme: SiteThemeId) {
    setCurrent(theme);
    setOpen(false);
    const next = { ...(loadPreferences() ?? {}), theme };
    applyPreferences({ theme });
    savePreferences(next);
    if (loggedIn) {
      void fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { theme } }),
      }).catch(() => undefined);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Change site theme"
        aria-expanded={open}
        className="grid h-8 w-8 place-items-center rounded-full border"
        style={{ borderColor: "var(--border)" }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" />
          <circle cx="7.5" cy="11" r="1" />
          <circle cx="10" cy="7" r="1" />
          <circle cx="15" cy="7" r="1" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="mascot-panel absolute right-0 z-40 mt-2 max-h-[70vh] w-56 overflow-y-auto rounded-xl border p-1.5 shadow-xl"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          {SITE_THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={current === option.id}
              onClick={() => choose(option.id)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:opacity-80"
              style={current === option.id ? { background: "color-mix(in srgb, var(--accent) 16%, transparent)" } : undefined}
            >
              <span className="flex h-5 w-9 overflow-hidden rounded border" style={{ borderColor: "var(--border)" }}>
                {option.swatch.map((color) => (
                  <span key={color} className="flex-1" style={{ background: color }} />
                ))}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
