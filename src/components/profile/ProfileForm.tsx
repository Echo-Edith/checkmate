"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BOARD_THEMES, SITE_THEMES, type BoardThemeId, type SiteThemeId } from "@/lib/themes";
import { applyPreferences, savePreferences } from "@/lib/preferences";

interface ProfileFormProps {
  initial: {
    username: string;
    bio: string;
    theme: SiteThemeId;
    boardTheme: BoardThemeId;
    tutorPersonality: "teacher" | "coach" | "analyst";
  };
}

const inputClass = "mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm";
const borderStyle = { borderColor: "var(--border)" } as const;

export function ProfileForm({ initial }: ProfileFormProps) {
  const [username, setUsername] = useState(initial.username);
  const [bio, setBio] = useState(initial.bio);
  const [theme, setTheme] = useState(initial.theme);
  const [boardTheme, setBoardTheme] = useState(initial.boardTheme);
  const [tutorPersonality, setTutorPersonality] = useState(initial.tutorPersonality);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // Mirror the saved preferences into this browser so they apply on every page.
  useEffect(() => {
    const prefs = { theme: initial.theme, boardTheme: initial.boardTheme, tutorPersonality: initial.tutorPersonality };
    applyPreferences(prefs);
    savePreferences(prefs);
  }, [initial.theme, initial.boardTheme, initial.tutorPersonality]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          bio,
          preferences: { theme, boardTheme, tutorPersonality },
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: Record<string, string[] | undefined>;
      };
      if (!response.ok) {
        const detail = data.details ? Object.values(data.details).flat()[0] : undefined;
        throw new Error(detail ?? data.error ?? "Could not save your profile.");
      }
      const prefs = { theme, boardTheme, tutorPersonality };
      applyPreferences(prefs);
      savePreferences(prefs);
      setMessage({ kind: "ok", text: "Profile saved." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not save your profile." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-medium">
        Username
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={24}
          required
          className={inputClass}
          style={borderStyle}
        />
      </label>

      <label className="block text-sm font-medium">
        About you
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3} className={inputClass} style={borderStyle} />
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Site theme</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SITE_THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setTheme(option.id);
                applyPreferences({ theme: option.id });
              }}
              aria-pressed={theme === option.id}
              className="rounded-lg border p-2 text-left text-xs"
              style={{ borderColor: theme === option.id ? "var(--accent)" : "var(--border)", borderWidth: theme === option.id ? 2 : 1 }}
            >
              <span className="mb-1.5 flex h-6 overflow-hidden rounded">
                {option.swatch.map((color) => (
                  <span key={color} className="flex-1" style={{ background: color }} />
                ))}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Board colours</legend>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-7">
          {BOARD_THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setBoardTheme(option.id);
                applyPreferences({ boardTheme: option.id });
              }}
              aria-pressed={boardTheme === option.id}
              className="rounded-lg border p-2 text-left text-xs"
              style={{ borderColor: boardTheme === option.id ? "var(--accent)" : "var(--border)", borderWidth: boardTheme === option.id ? 2 : 1 }}
            >
              <span className="mb-1.5 grid h-8 grid-cols-2 overflow-hidden rounded">
                <span style={{ background: option.swatch[0] }} />
                <span style={{ background: option.swatch[1] }} />
                <span style={{ background: option.swatch[1] }} />
                <span style={{ background: option.swatch[0] }} />
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium sm:max-w-xs">
        Favourite tutor
        <select value={tutorPersonality} onChange={(e) => setTutorPersonality(e.target.value as typeof tutorPersonality)} className={inputClass} style={borderStyle}>
          <option value="teacher">Teacher</option>
          <option value="coach">Coach</option>
          <option value="analyst">Analyst</option>
        </select>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md px-4 py-2 text-sm font-medium text-[color:var(--accent-fg)] disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {message && (
          <span role={message.kind === "error" ? "alert" : "status"} className={`text-sm ${message.kind === "error" ? "text-red-500" : ""}`} style={message.kind === "ok" ? { color: "var(--accent)" } : undefined}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
