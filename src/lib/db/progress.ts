import "server-only";
import type { Collection } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { setStats } from "@/lib/db/profiles";

/** One compact document per user holding lesson and puzzle progress (IDs only). */
export interface PuzzleProgress {
  solved: string[];
  attempts: number;
  correct: number;
  streak: number;
  bestStreak: number;
  hintsUsed: number;
}

export interface ProgressDoc {
  userId: string;
  lessons: string[];
  puzzles: PuzzleProgress;
  updatedAt: Date;
}

export const EMPTY_PUZZLE_PROGRESS: PuzzleProgress = {
  solved: [],
  attempts: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  hintsUsed: 0,
};

let indexesReady: Promise<void> | undefined;

async function getProgressCollection(): Promise<Collection<ProgressDoc>> {
  const db = await getDb();
  const collection = db.collection<ProgressDoc>("progress");
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

export async function getProgress(userId: string): Promise<ProgressDoc> {
  const collection = await getProgressCollection();
  const doc = await collection.findOne({ userId }, { projection: { _id: 0 } });
  return (
    doc ?? {
      userId,
      lessons: [],
      puzzles: { ...EMPTY_PUZZLE_PROGRESS },
      updatedAt: new Date(0),
    }
  );
}

/** Marks a lesson complete (idempotent) and mirrors the count into the profile stats. */
export async function completeLesson(userId: string, lessonId: string): Promise<string[]> {
  const collection = await getProgressCollection();
  await collection.updateOne(
    { userId },
    {
      $addToSet: { lessons: lessonId },
      $set: { updatedAt: new Date() },
      $setOnInsert: { puzzles: { ...EMPTY_PUZZLE_PROGRESS } },
    },
    { upsert: true },
  );
  const doc = await collection.findOne({ userId }, { projection: { _id: 0, lessons: 1 } });
  const lessons = doc?.lessons ?? [lessonId];
  await setStats(userId, { lessonsCompleted: lessons.length });
  return lessons;
}

/** Records one puzzle attempt, updating accuracy and streaks. */
export async function recordPuzzleAttempt(
  userId: string,
  puzzleId: string,
  solved: boolean,
  hintsUsed: number,
): Promise<PuzzleProgress> {
  const collection = await getProgressCollection();
  const current = (await getProgress(userId)).puzzles;

  const streak = solved ? current.streak + 1 : 0;
  const next: PuzzleProgress = {
    solved: solved && !current.solved.includes(puzzleId) ? [...current.solved, puzzleId] : current.solved,
    attempts: current.attempts + 1,
    correct: current.correct + (solved ? 1 : 0),
    streak,
    bestStreak: Math.max(current.bestStreak, streak),
    hintsUsed: current.hintsUsed + hintsUsed,
  };

  await collection.updateOne(
    { userId },
    { $set: { puzzles: next, updatedAt: new Date() }, $setOnInsert: { lessons: [] } },
    { upsert: true },
  );
  await setStats(userId, { puzzlesAttempted: next.attempts, puzzlesSolved: next.solved.length });
  return next;
}
