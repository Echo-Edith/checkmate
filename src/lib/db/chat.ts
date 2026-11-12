import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";

/** Chat messages for a game or between two friends. Any text is allowed; only the length is limited. */
export const MAX_MESSAGE_LENGTH = 500;

interface MessageDoc {
  _id: ObjectId;
  /** Conversation key, like "g:<gameId>" or "d:<userA>:<userB>". */
  k: string;
  u: string;
  name: string;
  text: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  mine: boolean;
  name: string;
  text: string;
  at: string;
}

let indexesReady: Promise<void> | undefined;

async function messages() {
  const db = await getDb();
  const collection = db.collection<MessageDoc>("messages");
  indexesReady ??= Promise.all([
    collection.createIndex({ k: 1, _id: 1 }),
    // Old messages are deleted after 30 days to keep storage small.
    collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 }),
  ])
    .then(() => undefined)
    .catch((error: unknown) => {
      indexesReady = undefined;
      throw error;
    });
  await indexesReady;
  return collection;
}

export const gameKey = (gameId: string) => `g:${gameId}`;
export const dmKey = (x: string, y: string) => (x < y ? `d:${x}:${y}` : `d:${y}:${x}`);

export async function sendMessage(key: string, userId: string, name: string, rawText: string): Promise<ChatMessage> {
  const text = rawText.slice(0, MAX_MESSAGE_LENGTH).trim();
  if (!text) throw new Error("empty");
  const col = await messages();
  const doc = { k: key, u: userId, name, text, createdAt: new Date() };
  const inserted = await col.insertOne(doc as MessageDoc);
  return { id: String(inserted.insertedId), mine: true, name, text, at: doc.createdAt.toISOString() };
}

/** Newest 50 messages, or only the ones after `afterId` when polling. */
export async function listMessages(key: string, userId: string, afterId?: string): Promise<ChatMessage[]> {
  const col = await messages();
  const after = afterId && ObjectId.isValid(afterId) ? new ObjectId(afterId) : null;
  const docs = after
    ? await col.find({ k: key, _id: { $gt: after } }).sort({ _id: 1 }).limit(50).toArray()
    : (await col.find({ k: key }).sort({ _id: -1 }).limit(50).toArray()).reverse();
  return docs.map((doc) => ({ id: String(doc._id), mine: doc.u === userId, name: doc.name, text: doc.text, at: doc.createdAt.toISOString() }));
}
