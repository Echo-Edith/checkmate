/** Client-side helpers that apply saved preferences (theme, board colours, tutor). Browser only. */

export interface StoredPreferences {
  theme?: "system" | "light" | "dark";
  boardTheme?: "classic" | "green" | "blue";
  tutorPersonality?: "teacher" | "coach" | "analyst";
}

const KEY = "checkm8:prefs";

export function applyPreferences(prefs: StoredPreferences): void {
  const root = document.documentElement;
  if (prefs.theme === "system") delete root.dataset.theme;
  else if (prefs.theme) root.dataset.theme = prefs.theme;
  if (prefs.boardTheme) root.dataset.board = prefs.boardTheme;
}

export function savePreferences(prefs: StoredPreferences): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be blocked (private mode). Preferences still live in the profile.
  }
}

export function loadPreferences(): StoredPreferences | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredPreferences) : null;
  } catch {
    return null;
  }
}
