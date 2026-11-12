import "server-only";
import { earnedIds } from "@/lib/achievements";
import { LESSONS } from "@/lib/content/lessons";
import { PUZZLES } from "@/lib/content/puzzles";
import { getDb } from "@/lib/db/mongodb";
import { getProgress } from "@/lib/db/progress";

/**
 * Works out which achievements a player has reached and saves the new ones.
 * Each one is added with a filter, so two checks at the same time can never add it twice.
 */
export async function checkAndAward(userId: string): Promise<string[]> {
  const db = await getDb();
  const profiles = db.collection("profiles");
  const profile = await profiles.findOne({ userId });
  if (!profile) return [];

  const [progress, friendCount] = await Promise.all([
    getProgress(userId),
    db.collection("friendships").countDocuments({ $or: [{ a: userId }, { b: userId }], status: "accepted" }),
  ]);

  const stats = (profile.stats ?? {}) as Record<string, number | undefined>;
  const have = new Set((Array.isArray(profile.achievements) ? profile.achievements : []).map((a: { id: string }) => a.id));
  const earned = earnedIds({
    gamesPlayed: stats.gamesPlayed ?? 0,
    gamesWon: stats.gamesWon ?? 0,
    onlineGames: Number(profile.onlineGames ?? 0),
    onlineWins: Number(profile.onlineWins ?? 0),
    puzzlesSolved: progress.puzzles.solved.length,
    totalPuzzles: PUZZLES.length,
    bestStreak: progress.puzzles.bestStreak,
    lessonsDone: progress.lessons.length,
    totalLessons: LESSONS.length,
    peakRating: Number(profile.peakRating ?? profile.rating ?? 1200),
    friends: friendCount,
    hasAvatar: Boolean((profile.avatar as { updatedAt?: Date } | undefined)?.updatedAt),
  });

  const added: string[] = [];
  for (const id of earned) {
    if (have.has(id)) continue;
    const result = await profiles.updateOne(
      { userId, "achievements.id": { $ne: id } },
      { $push: { achievements: { id, at: new Date(), seen: false } } as never },
    );
    if (result.modifiedCount === 1) added.push(id);
  }
  return added;
}

/** The achievements the player has not been told about yet. Marks them as seen. */
export async function takeUnseen(userId: string): Promise<string[]> {
  const db = await getDb();
  const profiles = db.collection("profiles");
  const profile = await profiles.findOne({ userId }, { projection: { achievements: 1 } });
  const unseen = (Array.isArray(profile?.achievements) ? profile.achievements : []).filter((a: { seen: boolean }) => !a.seen).map((a: { id: string }) => a.id);
  if (unseen.length > 0) {
    await profiles.updateOne({ userId }, { $set: { "achievements.$[item].seen": true } }, { arrayFilters: [{ "item.seen": false }] });
  }
  return unseen;
}
