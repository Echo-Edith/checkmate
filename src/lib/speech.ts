/** Read-aloud helpers built on the browser's own speech engine (free, no server, nothing to install). */

const VOICE_KEY = "checkm8:voice";
const VOICE_EVENT = "checkm8:voice-change";

function browserVoiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function speechSupported(): boolean {
  return browserVoiceSupported() || (typeof window !== "undefined" && typeof Audio !== "undefined");
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
let cachedVoiceLang = "";

/** Language code of the site, read from the language cookie. */
function siteSpeechLang(): string {
  const id = /(?:^|; )lang=([a-z]{2})/.exec(document.cookie)?.[1] ?? "en";
  const map: Record<string, string> = { en: "en-US", es: "es-ES", fr: "fr-FR", de: "de-DE", pt: "pt-BR", ja: "ja-JP", zh: "zh-CN" };
  return map[id] ?? "en-US";
}

/** Best-sounding voice the device has. "Natural"/"Neural" voices are far less robotic. */
function pickVoice(): SpeechSynthesisVoice | null {
  const want = siteSpeechLang();
  if (cachedVoice && cachedVoiceLang === want) return cachedVoice;
  cachedVoice = undefined;
  cachedVoiceLang = want;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith(want.slice(0, 2)));
  const pool = english.length > 0 ? english : voices;
  const preferred = [/natural|neural|online/i, /premium|enhanced/i, /aria|jenny|guy|samantha|ava|allison|zira/i, /google/i];
  for (const pattern of preferred) {
    const match = pool.find((voice) => pattern.test(voice.name));
    if (match) {
      cachedVoice = match;
      return match;
    }
  }
  cachedVoice = pool.find((voice) => voice.default) ?? pool[0] ?? null;
  return cachedVoice;
}

/** Plays the device voice. Slightly higher pitch and a quick pace make it sound brighter. */
function browserSpeak(spoken: string, onEnd?: () => void): void {
  if (!browserVoiceSupported()) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(spoken);
  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = siteSpeechLang();
  }
  utterance.rate = 1.08;
  utterance.pitch = 1.1;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

let playToken = 0;
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;
let naturalBlockedUntil = 0;

function releaseAudio(): void {
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
}

export function stopSpeaking(): void {
  playToken += 1;
  releaseAudio();
  if (browserVoiceSupported()) window.speechSynthesis.cancel();
}

export type VoicePersona = "teacher" | "coach" | "analyst";

/**
 * Speaks the text. It first asks the server for a natural, expressive voice (needs a login).
 * If that is not available, it uses the voice built into the device.
 */
export function speak(text: string, onEnd?: () => void, persona: VoicePersona = "teacher"): void {
  const spoken = toSpokenText(text);
  stopSpeaking();
  if (!spoken) {
    onEnd?.();
    return;
  }
  const token = playToken;
  const fallback = () => {
    if (token === playToken) browserSpeak(spoken, onEnd);
  };

  if (typeof Audio === "undefined" || Date.now() < naturalBlockedUntil) {
    fallback();
    return;
  }

  fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: spoken.slice(0, 700), persona }),
  })
    .then(async (response) => {
      if (token !== playToken) return;
      if (!response.ok) {
        // Not logged in or not set up: do not retry for a few minutes.
        if (response.status !== 429) naturalBlockedUntil = Date.now() + 5 * 60_000;
        throw new Error("natural voice unavailable");
      }
      const blob = await response.blob();
      if (token !== playToken) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      currentUrl = url;
      audio.onended = () => {
        if (token !== playToken) return;
        releaseAudio();
        onEnd?.();
      };
      audio.onerror = () => {
        releaseAudio();
        fallback();
      };
      await audio.play();
    })
    .catch(() => {
      releaseAudio();
      fallback();
    });
}

/**
 * Reads a reply out loud while it is still being written, sentence by sentence, with the device voice (no waiting).
 * Call `push` with the full text so far, then `finish` with the final text.
 */
export function createLiveSpeaker(onEnd?: () => void): { push: (text: string) => void; finish: (text: string) => void } {
  stopSpeaking();
  let spokenLength = 0;
  let pendingUtterances = 0;
  let finished = false;
  let ended = false;

  function checkEnd() {
    if (finished && pendingUtterances === 0 && !ended) {
      ended = true;
      onEnd?.();
    }
  }

  function say(chunk: string) {
    const spoken = toSpokenText(chunk);
    if (!spoken || !browserVoiceSupported()) return;
    const utterance = new SpeechSynthesisUtterance(spoken);
    const voice = pickVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = siteSpeechLang();
    }
    utterance.rate = 1.08;
    utterance.pitch = 1.1;
    pendingUtterances += 1;
    const done = () => {
      pendingUtterances -= 1;
      checkEnd();
    };
    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.speak(utterance);
  }

  return {
    push(text: string) {
      const rest = text.slice(spokenLength);
      const match = /^[\s\S]*[.!?](?=\s)/.exec(rest);
      if (!match) return;
      say(match[0]);
      spokenLength += match[0].length;
    },
    finish(text: string) {
      const rest = text.slice(spokenLength);
      spokenLength = text.length;
      if (rest.trim()) say(rest);
      finished = true;
      checkEnd();
    },
  };
}
