import "server-only";
import { logAiError } from "@/lib/db/ai-errors";
import type { Persona } from "@/lib/tutor/schema";

/** Gemini text-to-speech voices and the way each tutor should sound. */
const VOICES: Record<Persona, { voice: string; style: string }> = {
  teacher: { voice: "Zephyr", style: "Say warmly and cheerfully, like a patient teacher who is proud of the student" },
  coach: { voice: "Puck", style: "Say with high energy, like an upbeat motivating coach who believes in the player" },
  analyst: { voice: "Charon", style: "Say in a calm, confident and friendly tone" },
};

const TTS_MODELS = [process.env.GEMINI_TTS_MODEL, "gemini-2.5-flash-preview-tts", "gemini-2.5-flash-tts"].filter(
  (name): name is string => Boolean(name),
);

export class TtsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Wraps raw 16-bit mono PCM audio in a WAV header so every browser can play it. */
function pcmToWav(pcm: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const cache = new Map<string, Buffer>();
const CACHE_LIMIT = 60;

/** Turns text into natural, expressive speech. Returns a WAV file. */
export async function synthesizeSpeech(text: string, persona: Persona): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new TtsError("Voice is not configured.", 503);

  const key = `${persona}:${text}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { voice, style } = VOICES[persona];
  const body = {
    contents: [{ parts: [{ text: `${style}: ${text}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  };

  const attempts: string[] = [];
  const giveUp = async (status: number, summary: string): Promise<never> => {
    await logAiError({ source: "voice", status, summary, attempts });
    throw new TtsError("The voice didn't respond. Please try again in a moment.", status === 429 ? 429 : 502);
  };

  let lastStatus = 502;
  for (const model of TTS_MODELS) {
    // Two tries per model: a slow or overloaded answer is tried again before giving up.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const t0 = Date.now();
      let response: Response;
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(12000),
        });
      } catch {
        attempts.push(`${model}: timeout or network failure after ${Date.now() - t0}ms`);
        lastStatus = 504;
        continue;
      }
      lastStatus = response.status;
      if (response.status === 404) {
        attempts.push(`${model}: not found`);
        break;
      }
      if (!response.ok) {
        const reason = ((await response.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "";
        attempts.push(`${model}: HTTP ${response.status} ${reason.slice(0, 150)}`);
        // Rate limit or Google-side error: try again. Anything else will not improve.
        if (response.status === 429 || response.status >= 500) continue;
        return giveUp(response.status, `Voice request rejected (HTTP ${response.status}): ${reason.slice(0, 200)}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
      };
      const inline = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData;
      if (!inline?.data) {
        attempts.push(`${model}: answered without audio`);
        continue;
      }

      const rate = Number(/rate=(\d+)/.exec(inline.mimeType ?? "")?.[1] ?? 24000);
      const wav = pcmToWav(Buffer.from(inline.data, "base64"), rate);
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
      cache.set(key, wav);
      return wav;
    }
  }
  return giveUp(lastStatus === 404 ? 502 : lastStatus, "The voice service did not return audio after retrying.");
}
