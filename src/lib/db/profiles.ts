import "server-only";
import type { Collection } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_STATS,
  type UserPreferences,
  type UserProfileDoc,
  type UserStats,
} from "@/lib/db/types";

let indexesReady: Promise<void> | undefined;

async function getProfiles(): Promise<Collection<UserProfileDoc>> {
  const db = await getDb();
  const collection = db.collection<UserProfileDoc>("profiles");
  // Create the unique ownership index once per server instance.
  indexesReady ??= collection
    .createIndex({ userId: 1 }, { unique: true })
    .then(() => undefined)
    .catch((error: unknown) => {
      indexesReady = undefined;
      throw error;
    });
  await indexesReady;
  return collection;
}

function defaultUsername(userId: string, email: string | undefined): string {
  const base = (email?.split("@")[0] ?? "player").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
  return `${base || "player"}_${userId.slice(0, 4)}`;
}

/**
 * Returns the profile for the verified user, creating it on first use.
 * `userId` must come from the verified Supabase session, never from the client.
 */
export async function getOrCreateProfile(userId: string, email: string | undefined): Promise<UserProfileDoc> {
  const profiles = await getProfiles();
  const now = new Date();

  const profile = await profiles.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        username: defaultUsername(userId, email),
        bio: "",
        preferences: DEFAULT_PREFERENCES,
        stats: DEFAULT_STATS,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true, returnDocument: "after", projection: { _id: 0 } },
  );

  if (!profile) throw new Error("Could not load profile.");
  return profile;
}

/** Server-side only: sets absolute stat values (used by progress tracking). */
export async function setStats(userId: string, fields: Partial<UserStats>): Promise<void> {
  const profiles = await getProfiles();
  const $set: Record<string, number | Date> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "number") $set[`stats.${key}`] = value;
  }
  await profiles.updateOne({ userId }, { $set });
}

/** Server-side only: atomically increments stat counters (used when a game is saved). */
export async function incrementStats(userId: string, fields: Partial<UserStats>): Promise<void> {
  const profiles = await getProfiles();
  const $inc: Record<string, number> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "number") $inc[`stats.${key}`] = value;
  }
  await profiles.updateOne({ userId }, { $inc, $set: { updatedAt: new Date() } });
}

export interface ProfileUpdate {
  username?: string;
  bio?: string;
  preferences?: Partial<UserPreferences>;
}

/** Updates only the fields the user is allowed to edit. Stats are never client-writable. */
export async function updateProfile(userId: string, update: ProfileUpdate): Promise<UserProfileDoc | null> {
  const profiles = await getProfiles();
  const $set: Record<string, unknown> = { updatedAt: new Date() };

  if (update.username !== undefined) $set.username = update.username;
  if (update.bio !== undefined) $set.bio = update.bio;
  for (const [key, value] of Object.entries(update.preferences ?? {})) {
    $set[`preferences.${key}`] = value;
  }

  return profiles.findOneAndUpdate(
    { userId },
    { $set },
    { returnDocument: "after", projection: { _id: 0 } },
  );
}
