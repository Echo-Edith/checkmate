/** Site and board themes. Shared by the profile form, the API validation and the theme switcher. */

export const SITE_THEMES = [
  { id: "system", label: "Match my device", swatch: ["#ffffff", "#15803d", "#18181b"] },
  { id: "light", label: "Light", swatch: ["#ffffff", "#15803d", "#18181b"] },
  { id: "dark", label: "Dark", swatch: ["#0b0b0d", "#4ade80", "#f4f4f5"] },
  { id: "midnight", label: "Midnight", swatch: ["#0b1020", "#6366f1", "#e0e7ff"] },
  { id: "forest", label: "Forest", swatch: ["#0d1a12", "#22a559", "#dcfce7"] },
  { id: "ocean", label: "Ocean", swatch: ["#eaf6fb", "#0284c7", "#0c2d3f"] },
  { id: "sunset", label: "Sunset", swatch: ["#1c1114", "#f97316", "#ffedd5"] },
  { id: "rose", label: "Rose", swatch: ["#fff1f4", "#e11d48", "#3f0d1a"] },
  { id: "royal", label: "Royal", swatch: ["#17102b", "#a855f7", "#f3e8ff"] },
  { id: "paper", label: "Paper", swatch: ["#f6efe2", "#92400e", "#2b2015"] },
] as const;

export const BOARD_THEMES = [
  { id: "green", label: "Green", swatch: ["#eeeed2", "#769656"] },
  { id: "classic", label: "Classic wood", swatch: ["#f0d9b5", "#b58863"] },
  { id: "blue", label: "Blue", swatch: ["#dee3e6", "#8ca2ad"] },
  { id: "purple", label: "Purple", swatch: ["#e8e0f0", "#8877b3"] },
  { id: "ice", label: "Ice", swatch: ["#e9f3f8", "#6fa8c7"] },
  { id: "coral", label: "Coral", swatch: ["#fbe8dc", "#d9825b"] },
  { id: "slate", label: "Slate", swatch: ["#c9ced6", "#5b6577"] },
] as const;

export const SITE_THEME_IDS = ["system", "light", "dark", "midnight", "forest", "ocean", "sunset", "rose", "royal", "paper"] as const;
export const BOARD_THEME_IDS = ["green", "classic", "blue", "purple", "ice", "coral", "slate"] as const;

export type SiteThemeId = (typeof SITE_THEME_IDS)[number];
export type BoardThemeId = (typeof BOARD_THEME_IDS)[number];
