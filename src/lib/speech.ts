/** Read-aloud helpers built on the browser's own speech engine (free, no server, nothing to install). */

const VOICE_KEY = "checkm8:voice";
const VOICE_EVENT = "checkm8:voice-change";

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function readVoiceSetting(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) === "on";
  } catch {
    return false;
  }
}

export function writeVoiceSetting(on: boolean): void {
  try {
    localStorage.setItem(VOICE_KEY, on ? "on" : "off");
  } catch {
    // Not saving is fine.
  }
  window.dispatchEvent(new Event(VOICE_EVENT));
}

export function onVoiceSettingChange(listener: () => void): () => void {
  window.addEventListener(VOICE_EVENT, listener);
  return () => window.removeEventListener(VOICE_EVENT, listener);
}

const PIECES: Record<string, string> = { K: "King", Q: "Queen", R: "Rook", B: "Bishop", N: "Knight" };

/** Turns chess shorthand and symbols into words so the voice does not say "N f 3". */
export function toSpokenText(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_`>]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\bO-O-O\b/g, "castles long")
    .replace(/\bO-O\b/g, "castles short")
    .replace(/\b([KQRBN])([a-h]?[1-8]?)(x?)([a-h][1-8])(=[QRBN])?([+#]?)(?![a-z0-9])/g, (_m, piece: string, from: string, cap: string, to: string, promo: string | undefined, mark: string) => {
      const parts = [PIECES[piece] ?? piece];
      if (from) parts.push(from);
      parts.push(cap ? "takes" : "to", to);
      if (promo) parts.push("promotes to", PIECES[promo.slice(1)] ?? "");
      if (mark === "+") parts.push("check");
      if (mark === "#") parts.push("checkmate");
      return parts.join(" ");
    })
    .replace(/\b([a-h])x([a-h][1-8])\b/g, "$1 takes $2")
    .replace(/\+(\d)/g, "plus $1")
    .replace(/\s+/g, " ")
    .trim();
}

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;
  cachedVoice = pool.find((voice) => /natural|neural|google|samantha|enhanced/i.test(voice.name)) ?? pool.find((voice) => voice.default) ?? pool[0] ?? null;
  return cachedVoice;
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}

/** Speaks the text. Anything already being said is stopped first. */
export function speak(text: string, onEnd?: () => void): void {
  if (!speechSupported()) {
    onEnd?.();
    return;
  }
  const spoken = toSpokenText(text);
  window.speechSynthesis.cancel();
  if (!spoken) {
    onEnd?.();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(spoken);
  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-US";
  }
  utterance.rate = 1.05;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}
