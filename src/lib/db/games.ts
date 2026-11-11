import "server-only";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db/mongodb";

/**
 * Games are stored compactly: SAN moves joined by spaces (about 3-6 bytes per ply),
 * never engine output, which can be regenerated in the browser.
 */
export interface GameDoc {
  userId: string;
  moves: string;
  result: "1-0" | "0-1" | "1/2-1/2";
  color: "w" | "b";
  mode: "computer" | "pvp";
  level: number | null;
  resigned: boolean;
  plies: number;
  createdAt: Date;
}

export interface GameSummary {
  id: string;
  result: GameDoc["result"];
  color: GameDoc["color"];
  mode: GameDoc["mode"];
  level: number | null;
  resigned: boolean;
  plies: number;
  createdAt: string;
}

export interface GameDetail extends GameSummary {
  moves: string[];
}

/** Safety cap so one account cannot fill the free database tier. Nothing is deleted automatically. */
export const MAX_GAMES_PER_USER = 300;

let indexesReady: Promise<void> | undefined;

async function getGames(): Promise<Collection<GameDoc>> {
  const db = await getDb();
  const collection = db.collection<GameDoc>("games");
  indexesReady ??= collection
    .createIndex({ userId: 1, createdAt: -1 })
    .then(() => undefined)
    .catch((error: unknown) => {
      indexesReady = undefined;
      throw error;
    });
  await indexesReady;
  return collection;
}

function toSummary(id: ObjectId, doc: Omit<GameDoc, "moves" | "userId">): GameSummary {
  return {
    id: id.toHexString(),
    result: doc.result,
    color: doc.color,
    mode: doc.mode,
    level: doc.level,
    resigned: doc.resigned,
    plies: doc.plies,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function countGames(userId: string): Promise<number> {
  const games = await getGames();
  return games.countDocuments({ userId });
}

export async function insertGame(doc: GameDoc): Promise<string> {
  const games = await getGames();
  const inserted = await games.insertOne(doc);
  return inserted.insertedId.toHexString();
}

export async function listGames(userId: string, limit = 50): Promise<GameSummary[]> {
  const games = await getGames();
  const docs = await games
    .find({ userId }, { projection: { moves: 0, userId: 0 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => toSummary(doc._id, doc));
}

export async function getGame(userId: string, id: string): Promise<GameDetail | null> {
  if (!ObjectId.isValid(id)) return null;
  const games = await getGames();
  // The userId filter guarantees users can only read their own games.
  const doc = await games.findOne({ _id: new ObjectId(id), userId });
  if (!doc) return null;
  return { ...toSummary(doc._id, doc), moves: doc.moves ? doc.moves.split(" ") : [] };
}

export async function deleteGame(userId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const games = await getGames();
  const result = await games.deleteOne({ _id: new ObjectId(id), userId });
  return result.deletedCount === 1;
}
