import "server-only";
import { getDb } from "@/lib/db/mongodb";

interface SiteSettingsDoc {
  _id: string;
  maintenance?: boolean;
}

let cache: { value: boolean; at: number } | null = null;

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
