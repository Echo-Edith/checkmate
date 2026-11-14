import "server-only";
import { getDb } from "@/lib/db/mongodb";

export interface AiErrorDoc {
  at: Date;
  /** Where it happened, for example "tutor", "translate", "lesson" or "voice". */
  source: string;
  /** HTTP status of the final failure (0 = network failure or timeout). */
  status: number;
  /** Plain-English cause for the owner. */
  summary: string;
  /** One line per try: model, status, time taken. */
  attempts: string[];
  /** Short account id of the player who hit it, if known. */
  userId?: string;
}

const KEEP_DAYS = 14;
const MAX_ROWS = 300;
let indexReady = false;

async function collection() {
  const db = await getDb();
  const docs = db.collection<AiErrorDoc>("ai_errors");
  if (!indexReady) {
    indexReady = true;
    await docs.createIndex({ at: 1 }, { expireAfterSeconds: KEEP_DAYS * 24 * 3600 }).catch(() => undefined);
  }
  return docs;
}

/** Never let an API key or long text from Google end up in the owner panel or the database. */
function clean(text: string, max: number): string {
  return text.replace(/AIza[0-9A-Za-z_-]{20,}/g, "[key]").replace(/\s+/g, " ").trim().slice(0, max);
}

/** Saves the detailed reason an AI call failed. Never throws, so it cannot make a failure worse. */
export async function logAiError(entry: Omit<AiErrorDoc, "at">): Promise<void> {
  try {
    const docs = await collection();
    await docs.insertOne({
      at: new Date(),
      source: clean(entry.source, 40),
      status: entry.status,
      summary: clean(entry.summary, 400),
      attempts: entry.attempts.slice(0, 12).map((line) => clean(line, 200)),
      ...(entry.userId ? { userId: entry.userId.slice(0, 8) } : {}),
    });
    // Keep the collection small even if something fails in a loop.
    const count = await docs.estimatedDocumentCount();
    if (count > MAX_ROWS) {
      const old = await docs.find({}, { projection: { _id: 1 } }).sort({ at: 1 }).limit(count - MAX_ROWS).toArray();
      if (old.length > 0) await docs.deleteMany({ _id: { $in: old.map((doc) => doc._id) } });
    }
  } catch {
    // Ignore.
  }
}

export async function listAiErrors(limit = 50): Promise<Array<AiErrorDoc & { id: string }>> {
  const docs = await collection();
  const rows = await docs.find({}).sort({ at: -1 }).limit(limit).toArray();
  return rows.map((row) => ({ ...row, id: String(row._id) }));
}

export async function clearAiErrors(): Promise<void> {
  const docs = await collection();
  await docs.deleteMany({});
}
