import "server-only";
import { getDb } from "@/lib/db/mongodb";
import { generateMatePuzzle } from "@/lib/content/generate";
import { getLesson, type Lesson } from "@/lib/content/lessons";
import { topicFor } from "@/lib/content/topics";
import { streamGemini } from "@/lib/tutor/gemini";
import { LANGS, type Lang } from "@/lib/i18n/messages";

/** Endless lessons use ids like "g-12". */
export function generatedLessonNumber(id: string): number | null {
  const match = /^g-(\d{1,5})$/.exec(id);
  return match ? Number(match[1]) : null;
}

/** The practice position of an endless lesson (a mate in 1). The same number always gives the same position. */
export function generatedPractice(n: number): NonNullable<Lesson["practice"]> {
  const puzzle = generateMatePuzzle(1_000_000 + n);
  return {
    prompt: "Find the checkmate in one move.",
    fen: puzzle.fen,
    lines: puzzle.lines,
    mateAny: true,
    explanation: "Checkmate! The king is attacked and has no way to escape.",
  };
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

async function writeBody(n: number, lang: Lang): Promise<string[]> {
  const topic = topicFor(n);
  const language = LANGS.find((item) => item.id === lang)?.ai ?? "English";
  const system = `You write short chess lessons for learners. Write in ${language}. Plain text only, no markdown, no headings, no lists. Exactly 3 short paragraphs separated by a blank line, about 120 words in total. Simple words. Use standard algebraic notation (like Nf3) only for moves you are sure are legal. Never invent facts.`;
  const angle = topic.round > 0 ? ` This is part ${topic.round + 1} of the topic, so cover a different and slightly deeper angle than a basic intro.` : "";
  const text = await readAll(await streamGemini(system, `Lesson topic: ${topic.title}. Cover: ${topic.idea}.${angle}`));
  const parts = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) throw new Error("Empty lesson");
  return parts.slice(0, 4);
}

/** Loads an endless lesson. The text is written once by the AI and saved, so later visits are instant. */
export async function getGeneratedLesson(n: number, lang: Lang): Promise<Lesson> {
  const topic = topicFor(n);
  const title = topic.round > 0 ? `${topic.title} (part ${topic.round + 1})` : topic.title;
  const id = `${n}-${lang}`;
  let body: string[] | null = null;
  try {
    const db = await getDb();
    const collection = db.collection<{ _id: string; body: string[] }>("generated_lessons");
    const saved = await collection.findOne({ _id: id });
    if (saved) {
      body = saved.body;
    } else {
      body = await writeBody(n, lang);
      await collection.updateOne({ _id: id }, { $setOnInsert: { body } }, { upsert: true });
    }
  } catch {
    // The AI or database is not available: fall back to a short built-in text.
    body = [`In this lesson you learn about: ${topic.idea}.`, "Read the idea, then try the practice position below. The AI writer is resting right now, so this is a short version."];
  }
  return { id: `g-${n}`, level: topic.level, title, summary: topic.idea, body, practice: generatedPractice(n) };
}

/** Finds any lesson, built-in or endless. */
export async function resolveLesson(id: string, lang: Lang): Promise<Lesson | undefined> {
  const builtIn = getLesson(id);
  if (builtIn) return builtIn;
  const n = generatedLessonNumber(id);
  return n === null ? undefined : getGeneratedLesson(n, lang);
}
