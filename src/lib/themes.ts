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
  { id: "oldschool", label: "Old school", swatch: ["#efe3c8", "#8b3a1a", "#3b2a1a"] },
  { id: "retro", label: "Retro terminal", swatch: ["#0a0f0a", "#39ff14", "#b6ffb0"] },
  { id: "cyber", label: "Cyber", swatch: ["#07070f", "#00f0ff", "#ff2bd6"] },
  { id: "vaporwave", label: "Vaporwave", swatch: ["#1b0b3a", "#ff71ce", "#01cdfe"] },
  { id: "arctic", label: "Arctic", swatch: ["#f2f8ff", "#2563eb", "#0b2540"] },
  { id: "candy", label: "Candy", swatch: ["#fff5fb", "#d946ef", "#4a1d4a"] },
] as const;

export const BOARD_THEMES = [
  { id: "green", label: "Green", swatch: ["#eeeed2", "#769656"] },
  { id: "classic", label: "Classic wood", swatch: ["#f0d9b5", "#b58863"] },
  { id: "blue", label: "Blue", swatch: ["#dee3e6", "#8ca2ad"] },
  { id: "purple", label: "Purple", swatch: ["#e8e0f0", "#8877b3"] },
  { id: "ice", label: "Ice", swatch: ["#e9f3f8", "#6fa8c7"] },
  { id: "coral", label: "Coral", swatch: ["#fbe8dc", "#d9825b"] },
  { id: "slate", label: "Slate", swatch: ["#c9ced6", "#5b6577"] },
  { id: "walnut", label: "Walnut", swatch: ["#d9b98a", "#6b3f22"] },
  { id: "marble", label: "Marble", swatch: ["#ece9e4", "#7d8a8c"] },
  { id: "ink", label: "Old school ink", swatch: ["#e8dcb8", "#3b3a36"] },
  { id: "cyber", label: "Cyber", swatch: ["#2a3f6b", "#0b132b"] },
  { id: "terminal", label: "Terminal", swatch: ["#1f3d1f", "#0a1a0a"] },
  { id: "night", label: "Night", swatch: ["#5d6b8f", "#2a3355"] },
  { id: "sakura", label: "Sakura", swatch: ["#fde4ec", "#e58aa8"] },
] as const;

export const SITE_THEME_IDS = ["system", "light", "dark", "midnight", "forest", "ocean", "sunset", "rose", "royal", "paper", "oldschool", "retro", "cyber", "vaporwave", "arctic", "candy"] as const;
export const BOARD_THEME_IDS = ["green", "classic", "blue", "purple", "ice", "coral", "slate", "walnut", "marble", "ink", "cyber", "terminal", "night", "sakura"] as const;

export const PIECE_SETS = [
  { id: "classic", label: "Classic" },
  { id: "gold", label: "Gold and onyx" },
  { id: "neon", label: "Neon" },
  { id: "ruby", label: "Ruby and pearl" },
  { id: "ice", label: "Ice" },
  { id: "wood", label: "Wooden" },
  { id: "outline", label: "Outline" },
  { id: "retro", label: "Green glow" },
  { id: "sunset", label: "Sunset" },
] as const;
export const PIECE_SET_IDS = ["classic", "gold", "neon", "ruby", "ice", "wood", "outline", "retro", "sunset"] as const;
export type PieceSetId = (typeof PIECE_SET_IDS)[number];

export type SiteThemeId = (typeof SITE_THEME_IDS)[number];
export type BoardThemeId = (typeof BOARD_THEME_IDS)[number];
