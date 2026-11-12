import "server-only";
import type { Collection } from "mongodb";
import { isOwnerEmail } from "@/lib/badges";
import { MIN_RATING, START_RATING } from "@/lib/elo";
import { getDb } from "@/lib/db/mongodb";
import { PIECE_SET_IDS, type PieceSetId } from "@/lib/themes";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_STATS,
  type UserAvatar,
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

/** New accounts get a neutral name. It must never be built from the email address, because usernames are public. */
function defaultUsername(userId: string): string {
  return `Player_${userId.replace(/-/g, "").slice(0, 6)}`;
}

/** Older accounts got a name built from the email. This rebuilds that old name so it can be replaced. */
function legacyUsername(userId: string, email: string | undefined): string {
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
        username: defaultUsername(userId),
        bio: "",
        preferences: DEFAULT_PREFERENCES,
        stats: DEFAULT_STATS,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true, returnDocument: "after", projection: { _id: 0, "avatar.data": 0 } },
  );

  if (!profile) throw new Error("Could not load profile.");

  // The owner badge follows the OWNER_EMAILS setting (added or removed to match it).
  const owner = isOwnerEmail(email);
  if ((profile.isOwner ?? false) !== owner) {
    await profiles.updateOne({ userId }, { $set: { isOwner: owner } });
    profile.isOwner = owner;
  }

  // Hide the email: replace an old email-based default name with a neutral one.
  if (profile.username === legacyUsername(userId, email)) {
    const username = defaultUsername(userId);
    await profiles.updateOne({ userId }, { $set: { username, updatedAt: new Date() } });
    return { ...profile, username };
  }
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

/** The piece design a player chose (used so an opponent sees it too). */
export async function getPieceSet(userId: string): Promise<PieceSetId> {
  const profiles = await getProfiles();
  const doc = await profiles.findOne({ userId }, { projection: { "preferences.pieceSet": 1 } });
  const value = doc?.preferences?.pieceSet;
  return (PIECE_SET_IDS as readonly string[]).includes(value ?? "") ? (value as PieceSetId) : "classic";
}

export interface ProfileUpdate {
  username?: string;
  bio?: string;
  isPublic?: boolean;
  preferences?: Partial<UserPreferences>;
}

/** Updates only the fields the user is allowed to edit. Stats are never client-writable. */
export async function updateProfile(userId: string, update: ProfileUpdate): Promise<UserProfileDoc | null> {
  const profiles = await getProfiles();
  const $set: Record<string, unknown> = { updatedAt: new Date() };

  if (update.username !== undefined) $set.username = update.username;
  if (update.bio !== undefined) $set.bio = update.bio;
  if (update.isPublic !== undefined) $set.isPublic = update.isPublic;
  for (const [key, value] of Object.entries(update.preferences ?? {})) {
    $set[`preferences.${key}`] = value;
  }

  return profiles.findOneAndUpdate(
    { userId },
    { $set },
    { returnDocument: "after", projection: { _id: 0, "avatar.data": 0 } },
  );
}

/** Saves the profile picture. The caller must already have validated size and type. */
export async function setAvatar(userId: string, avatar: { data: string; type: UserAvatar["type"] }): Promise<Date> {
  const profiles = await getProfiles();
  const updatedAt = new Date();
  await profiles.updateOne({ userId }, { $set: { avatar: { ...avatar, updatedAt }, updatedAt } });
  return updatedAt;
}

export async function clearAvatar(userId: string): Promise<void> {
  const profiles = await getProfiles();
  await profiles.updateOne({ userId }, { $unset: { avatar: "" }, $set: { updatedAt: new Date() } });
}

/** Current rating and how many rated games it is based on. */
export async function getRatingInfo(userId: string): Promise<{ rating: number; ratingGames: number }> {
  const profiles = await getProfiles();
  const doc = await profiles.findOne({ userId }, { projection: { rating: 1, ratingGames: 1 } });
  return { rating: doc?.rating ?? START_RATING, ratingGames: doc?.ratingGames ?? 0 };
}

/** Adds points to a rating (or removes them) and counts the game. Also keeps the highest rating reached. */
export async function applyRatingDelta(userId: string, delta: number): Promise<number> {
  const profiles = await getProfiles();
  const next = { $max: [MIN_RATING, { $add: [{ $ifNull: ["$rating", START_RATING] }, delta] }] };
  const updated = await profiles.findOneAndUpdate(
    { userId },
    [
      {
        $set: {
          rating: next,
          peakRating: { $max: [{ $ifNull: ["$peakRating", START_RATING] }, next] },
          ratingGames: { $add: [{ $ifNull: ["$ratingGames", 0] }, 1] },
          updatedAt: new Date(),
        },
      },
    ],
    { returnDocument: "after", projection: { rating: 1 } },
  );
  return updated?.rating ?? START_RATING;
}

/** Counts a finished online game (and a win) for the achievements. */
export async function countOnlineGame(userId: string, won: boolean): Promise<void> {
  const profiles = await getProfiles();
  await profiles.updateOne({ userId }, { $inc: { onlineGames: 1, onlineWins: won ? 1 : 0 } });
}
