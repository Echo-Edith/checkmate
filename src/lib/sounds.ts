/** Game sounds made with the browser's audio engine. No sound files, so nothing extra to download. */

const KEY = "checkm8:sound";
const EVENT = "checkm8:sound-change";

export type SoundKind = "move" | "capture" | "check" | "castle" | "win" | "lose" | "draw" | "message" | "notify";

export function readSoundSetting(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeSoundSetting(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Not saving is fine.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function onSoundSettingChange(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null;
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  return context;
}

function tone(ctx: AudioContext, start: number, frequency: number, duration: number, type: OscillatorType, volume: number, endFrequency?: number) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** A short wooden "tock": a burst of filtered noise plus a low thump. */
function knock(ctx: AudioContext, start: number, strength: number) {
  const length = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1500;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5 * strength, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.06);
  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start(start);
  tone(ctx, start, 190, 0.08, "sine", 0.35 * strength, 80);
}

export function playSound(kind: SoundKind): void {
  if (!readSoundSetting()) return;
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + 0.01;

  switch (kind) {
    case "move":
      knock(ctx, t, 1);
      break;
    case "capture":
      knock(ctx, t, 1.5);
      tone(ctx, t, 320, 0.07, "triangle", 0.18, 150);
      break;
    case "castle":
      knock(ctx, t, 1);
      knock(ctx, t + 0.11, 0.9);
      break;
    case "check":
      knock(ctx, t, 1.1);
      tone(ctx, t + 0.06, 880, 0.1, "sine", 0.2);
      tone(ctx, t + 0.15, 1175, 0.14, "sine", 0.2);
      break;
    case "win":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, t + i * 0.12, f, 0.28, "triangle", 0.25));
      break;
    case "lose":
      [392, 329.63, 261.63, 220].forEach((f, i) => tone(ctx, t + i * 0.18, f, 0.34, "sine", 0.25));
      break;
    case "draw":
      tone(ctx, t, 440, 0.25, "triangle", 0.22);
      tone(ctx, t + 0.22, 440, 0.35, "triangle", 0.22);
      break;
    case "message":
      tone(ctx, t, 660, 0.09, "sine", 0.16, 880);
      break;
    case "notify":
      tone(ctx, t, 988, 0.16, "sine", 0.22);
      tone(ctx, t + 0.13, 1319, 0.24, "sine", 0.22);
      break;
  }
}

/** Picks the sound for a move written in chess notation, like "Nxf3+" or "O-O". */
export function soundForSan(san: string): SoundKind {
  if (san.includes("+") || san.includes("#")) return "check";
  if (san.includes("x")) return "capture";
  if (san.startsWith("O-O")) return "castle";
  return "move";
}
