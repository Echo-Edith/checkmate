"use client";

import { useEffect, useState, type FormEvent } from "react";
import { applyPreferences, savePreferences } from "@/lib/preferences";

interface ProfileFormProps {
  initial: {
    username: string;
    bio: string;
    theme: "system" | "light" | "dark";
    boardTheme: "classic" | "green" | "blue";
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
          minLength={3}
          maxLength={24}
          pattern="[a-zA-Z0-9_]+"
          title="Letters, numbers and underscores only"
          required
          className={inputClass}
          style={borderStyle}
        />
      </label>

      <label className="block text-sm font-medium">
        About you
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3} className={inputClass} style={borderStyle} />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Theme
          <select value={theme} onChange={(e) => setTheme(e.target.value as typeof theme)} className={inputClass} style={borderStyle}>
            <option value="system">Match my device</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Board colours
          <select value={boardTheme} onChange={(e) => setBoardTheme(e.target.value as typeof boardTheme)} className={inputClass} style={borderStyle}>
            <option value="green">Green</option>
            <option value="classic">Classic wood</option>
            <option value="blue">Blue</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Favourite tutor
          <select value={tutorPersonality} onChange={(e) => setTutorPersonality(e.target.value as typeof tutorPersonality)} className={inputClass} style={borderStyle}>
            <option value="teacher">Teacher</option>
            <option value="coach">Coach</option>
            <option value="analyst">Analyst</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
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
