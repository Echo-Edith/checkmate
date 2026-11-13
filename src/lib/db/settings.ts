import "server-only";
import { getDb } from "@/lib/db/mongodb";

interface SiteSettingsDoc {
  _id: string;
  maintenance?: boolean;
  /** Free AI messages per player per day. Missing or null means unlimited. */
  aiDailyLimit?: number | null;
}

let cache: { value: boolean; at: number } | null = null;
let aiCache: { value: number | null; at: number } | null = null;

/** True while maintenance mode is on. Cached for a few seconds so every page does not hit the database. */
export async function isMaintenanceOn(): Promise<boolean> {
  if (cache && Date.now() - cache.at < 5000) return cache.value;
  const db = await getDb();
  const doc = await db.collection<SiteSettingsDoc>("settings").findOne({ _id: "site" });
  const value = doc?.maintenance === true;
  cache = { value, at: Date.now() };
  return value;
}

export async function setMaintenance(on: boolean): Promise<void> {
  const db = await getDb();
  await db.collection<SiteSettingsDoc>("settings").updateOne({ _id: "site" }, { $set: { maintenance: on } }, { upsert: true });
  cache = { value: on, at: Date.now() };
}

/** True if this signed-in user is a tester (has the Tester badge). */
export async function isTester(userId: string): Promise<boolean> {
  const db = await getDb();
  const doc = await db.collection("profiles").findOne({ userId }, { projection: { isBeta: 1 } });
  return doc?.isBeta === true;
}

/** Free AI messages each player gets per day (null = unlimited). Testers and the owner are never limited. */
export async function getAiDailyLimit(): Promise<number | null> {
  if (aiCache && Date.now() - aiCache.at < 5000) return aiCache.value;
  const db = await getDb();
  const doc = await db.collection<SiteSettingsDoc>("settings").findOne({ _id: "site" });
  const value = typeof doc?.aiDailyLimit === "number" ? doc.aiDailyLimit : null;
  aiCache = { value, at: Date.now() };
  return value;
}

export async function setAiDailyLimit(limit: number | null): Promise<void> {
  const db = await getDb();
  await db.collection<SiteSettingsDoc>("settings").updateOne({ _id: "site" }, { $set: { aiDailyLimit: limit } }, { upsert: true });
  aiCache = { value: limit, at: Date.now() };
}

interface UsageDoc {
  _id: string;
  count: number;
  day: string;
  at: Date;
}

let usageIndexReady = false;

async function usage() {
  const db = await getDb();
  const collection = db.collection<UsageDoc>("ai_usage");
  if (!usageIndexReady) {
    usageIndexReady = true;
    // Old counters clean themselves up after three days.
    await collection.createIndex({ at: 1 }, { expireAfterSeconds: 3 * 24 * 3600 }).catch(() => undefined);
  }
  return collection;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Counts one AI message for this player today. Returns false when they have used all their free messages.
 * The counter only goes up while it is below the limit, so two quick requests cannot slip past it.
 */
export async function takeAiUse(userId: string, limit: number): Promise<boolean> {
  if (limit <= 0) return false;
  const collection = await usage();
  const day = today();
  try {
    await collection.updateOne({ _id: `${userId}:${day}`, count: { $lt: limit } }, { $inc: { count: 1 }, $setOnInsert: { day, at: new Date() } }, { upsert: true });
    return true;
  } catch (error) {
    // The counter exists and is already at the limit, so the upsert collides.
    if ((error as { code?: number }).code === 11000) return false;
    throw error;
  }
}

/** How many AI messages everyone has used today (for the owner panel). */
export async function aiUseToday(): Promise<{ messages: number; players: number }> {
  const collection = await usage();
  const rows = await collection.aggregate<{ _id: null; messages: number; players: number }>([{ $match: { day: today() } }, { $group: { _id: null, messages: { $sum: "$count" }, players: { $sum: 1 } } }]).toArray();
  return { messages: rows[0]?.messages ?? 0, players: rows[0]?.players ?? 0 };
}
