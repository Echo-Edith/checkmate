import "server-only";
import { ObjectId, type Document } from "mongodb";
import { badgesFor, type BadgeId } from "@/lib/badges";
import { getDb } from "@/lib/db/mongodb";
import type { UserStats } from "@/lib/db/types";

/**
 * Public player data. Only the fields below ever leave the server for public pages:
 * never the email address, the sign-in user ID, or preferences.
 */
export interface PublicPlayer {
  id: string;
  username: string;
  bio: string;
  createdAt: string;
  stats: UserStats;
  score: number;
  rank: number;
  /** Changes whenever the picture changes (for cache busting). Null when there is no picture. */
  avatarVersion: number | null;
  badges: BadgeId[];
}

/** Score = 3 per win + 1 per draw + 2 per puzzle solved + 5 per lesson completed. */
const n = (field: string) => ({ $ifNull: [`$stats.${field}`, 0] });
const SCORE_EXPRESSION = {
  $add: [{ $multiply: [n("gamesWon"), 3] }, n("draws"), { $multiply: [n("puzzlesSolved"), 2] }, { $multiply: [n("lessonsCompleted"), 5] }],
};

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPlayer(doc: Document): PublicPlayer {
  const stats = (doc.stats ?? {}) as Partial<UserStats>;
  return {
    id: String(doc._id),
    username: String(doc.username ?? "Player"),
    bio: String(doc.bio ?? ""),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
    stats: {
      gamesPlayed: stats.gamesPlayed ?? 0,
      gamesWon: stats.gamesWon ?? 0,
      gamesLost: stats.gamesLost ?? 0,
      draws: stats.draws ?? 0,
      puzzlesAttempted: stats.puzzlesAttempted ?? 0,
      puzzlesSolved: stats.puzzlesSolved ?? 0,
      lessonsCompleted: stats.lessonsCompleted ?? 0,
    },
    score: Number(doc.score ?? 0),
    rank: Number(doc.rank ?? 0),
    badges: badgesFor({ isOwner: doc.isOwner === true, isBeta: doc.isBeta === true }),
    avatarVersion: doc.avatar?.updatedAt instanceof Date ? doc.avatar.updatedAt.getTime() : null,
  };
}

/** Ranks every public profile, then applies an optional filter. Rank is always the global rank. */
function rankedPipeline(after: Document[]): Document[] {
  return [
    { $match: { isPublic: { $ne: false } } },
    { $addFields: { score: SCORE_EXPRESSION } },
    { $setWindowFields: { sortBy: { score: -1 }, output: { rank: { $rank: {} } } } },
    ...after,
    { $project: { userId: 0, preferences: 0, updatedAt: 0, "avatar.data": 0 } },
  ];
}

export async function listPublicPlayers(options: { search?: string; limit?: number } = {}): Promise<PublicPlayer[]> {
  const db = await getDb();
  const search = options.search?.trim().slice(0, 30);
  const after: Document[] = [];
  if (search) after.push({ $match: { username: { $regex: escapeRegex(search), $options: "i" } } });
  after.push({ $sort: { rank: 1, createdAt: 1 } }, { $limit: Math.min(options.limit ?? 50, 100) });

  const docs = await db.collection("profiles").aggregate(rankedPipeline(after)).toArray();
  return docs.map(toPlayer);
}

export async function getPublicPlayer(id: string): Promise<PublicPlayer | null> {
  if (!ObjectId.isValid(id) || String(new ObjectId(id)) !== id) return null;
  const db = await getDb();
  const docs = await db
    .collection("profiles")
    .aggregate(rankedPipeline([{ $match: { _id: new ObjectId(id) } }]))
    .toArray();
  const doc = docs[0];
  return doc ? toPlayer(doc) : null;
}

/** The picture bytes for a public profile id. Private profiles only show their picture to the owner. */
export async function getAvatarImage(id: string, viewerUserId: string | null): Promise<{ bytes: Buffer; type: string; isPublic: boolean } | null> {
  if (!ObjectId.isValid(id) || String(new ObjectId(id)) !== id) return null;
  const db = await getDb();
  const doc = await db.collection("profiles").findOne({ _id: new ObjectId(id) }, { projection: { avatar: 1, userId: 1, isPublic: 1 } });
  const avatar = doc?.avatar as { data?: string; type?: string } | undefined;
  if (!doc || !avatar?.data || !avatar.type) return null;
  const isPublic = doc.isPublic !== false;
  if (!isPublic && doc.userId !== viewerUserId) return null;
  return { bytes: Buffer.from(avatar.data, "base64"), type: avatar.type, isPublic };
}

/** The signed-in user's own public id and picture version, for showing their picture. */
export async function getOwnPlayerRef(userId: string): Promise<{ id: string; avatarVersion: number | null } | null> {
  const db = await getDb();
  const doc = await db.collection("profiles").findOne({ userId }, { projection: { "avatar.updatedAt": 1 } });
  if (!doc) return null;
  const updatedAt = (doc.avatar as { updatedAt?: Date } | undefined)?.updatedAt;
  return { id: String(doc._id), avatarVersion: updatedAt instanceof Date ? updatedAt.getTime() : null };
}
