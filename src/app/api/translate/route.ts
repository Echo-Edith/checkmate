import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/mongodb";
import { LANGS, isLang } from "@/lib/i18n/messages";
import { checkRateLimit } from "@/lib/rate-limit";
import { GeminiError, streamGemini } from "@/lib/tutor/gemini";

export const maxDuration = 30;

const bodySchema = z
  .object({
    lang: z.string().max(5),
    texts: z.array(z.string().min(1).max(800)).min(1).max(40),
  })
  .strict();

interface CacheDoc {
  _id: string;
  t: string;
}

function keyOf(lang: string, text: string): string {
  return `${lang}:${createHash("sha1").update(text).digest("hex")}`;
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text.trim();
}

/** Translates website texts into the chosen language. Answers are saved, so each text is translated only once for everyone. */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isLang(parsed.data.lang) || parsed.data.lang === "en") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { lang, texts } = parsed.data;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`translate:${ip}`, 40, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const unique = [...new Set(texts)];
  const result: Record<string, string> = {};
  try {
    const db = await getDb();
    const collection = db.collection<CacheDoc>("translations");
    const saved = await collection.find({ _id: { $in: unique.map((text) => keyOf(lang, text)) } }).toArray();
    const byKey = new Map(saved.map((doc) => [doc._id, doc.t]));
    const missing: string[] = [];
    for (const text of unique) {
      const hit = byKey.get(keyOf(lang, text));
      if (hit !== undefined) result[text] = hit;
      else missing.push(text);
    }

    if (missing.length > 0) {
      const language = LANGS.find((item) => item.id === lang)?.ai ?? "English";
      const system = `You translate the interface text of a chess learning website from English into ${language}. You get a JSON array of strings. Reply with only a JSON array of strings, the same length and order. Rules: keep placeholders like {1} and {2} exactly; keep chess move notation (like Nf3, e4, O-O), the name Checkm8, symbols and line breaks as they are; keep the tone short and friendly; if a text is already in ${language}, return it unchanged.`;
      const raw = await readAll(await streamGemini(system, JSON.stringify(missing), { maxOutputTokens: 6000, json: true }));
      let translated: unknown;
      try {
        translated = JSON.parse(raw);
      } catch {
        translated = null;
      }
      if (Array.isArray(translated) && translated.length === missing.length && translated.every((item) => typeof item === "string")) {
        const docs: CacheDoc[] = [];
        missing.forEach((text, index) => {
          const value = (translated as string[])[index] ?? text;
          result[text] = value;
          docs.push({ _id: keyOf(lang, text), t: value });
        });
        await collection.bulkWrite(docs.map((doc) => ({ updateOne: { filter: { _id: doc._id }, update: { $setOnInsert: { t: doc.t } }, upsert: true } }))).catch(() => undefined);
      }
    }
    return NextResponse.json({ translations: result });
  } catch (error) {
    if (error instanceof GeminiError) return NextResponse.json({ error: error.message, translations: result }, { status: error.status >= 500 ? 502 : error.status });
    return NextResponse.json({ error: "Could not translate", translations: result }, { status: 500 });
  }
}
