/** Voice accents. The language stays the one the player chose; only the way it sounds changes. */

export const ACCENT_IDS = ["default", "japanese", "filipino", "mexican", "indian"] as const;
export type AccentId = (typeof ACCENT_IDS)[number];

export interface Accent {
  id: AccentId;
  label: string;
  /** Added to the instruction for the natural (Gemini) voice. */
  prompt: string;
  /** Region code used to find a matching voice on the device, for example "IN" for en-IN. */
  region: string;
  /** Language of the native voice, used as a rough match for English text when no regional voice exists. */
  nativeLang: string;
}

export const ACCENTS: Accent[] = [
  { id: "default", label: "Default", prompt: "", region: "", nativeLang: "" },
  { id: "japanese", label: "Japanese", prompt: "with a natural Japanese accent", region: "JP", nativeLang: "ja" },
  { id: "filipino", label: "Filipino", prompt: "with a natural Filipino accent", region: "PH", nativeLang: "fil" },
  { id: "mexican", label: "Mexican", prompt: "with a natural Mexican accent", region: "MX", nativeLang: "es" },
  { id: "indian", label: "Indian", prompt: "with a natural Indian accent", region: "IN", nativeLang: "hi" },
];

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === "string" && (ACCENT_IDS as readonly string[]).includes(value);
}

export function getAccent(id: AccentId): Accent {
  return ACCENTS.find((accent) => accent.id === id) ?? (ACCENTS[0] as Accent);
}
