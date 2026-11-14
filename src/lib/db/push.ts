import "server-only";
import { createHash } from "node:crypto";
import { getDb } from "@/lib/db/mongodb";

export interface PushKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionDoc {
  /** Hash of the endpoint, so one device is stored once. */
  _id: string;
  userId: string;
  endpoint: string;
  keys: PushKeys;
  createdAt: Date;
}

const MAX_DEVICES_PER_USER = 5;
let indexReady = false;

async function collection() {
  const db = await getDb();
  const docs = db.collection<PushSubscriptionDoc>("push_subscriptions");
  if (!indexReady) {
    indexReady = true;
    await docs.createIndex({ userId: 1 }).catch(() => undefined);
  }
  return docs;
}

const idFor = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex").slice(0, 32);

export async function savePushSubscription(userId: string, endpoint: string, keys: PushKeys): Promise<void> {
  const docs = await collection();
  const _id = idFor(endpoint);
  await docs.replaceOne({ _id }, { _id, userId, endpoint, keys, createdAt: new Date() }, { upsert: true });
  // Keep only the newest few devices per user.
  const mine = await docs.find({ userId }).sort({ createdAt: -1 }).project<{ _id: string }>({ _id: 1 }).toArray();
  const extra = mine.slice(MAX_DEVICES_PER_USER).map((d) => d._id);
  if (extra.length > 0) await docs.deleteMany({ _id: { $in: extra } });
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  const docs = await collection();
  await docs.deleteOne({ _id: idFor(endpoint), userId });
}

export async function listPushSubscriptions(userId: string): Promise<PushSubscriptionDoc[]> {
  const docs = await collection();
  return docs.find({ userId }).toArray();
}

export async function dropPushSubscription(id: string): Promise<void> {
  const docs = await collection();
  await docs.deleteOne({ _id: id });
}
