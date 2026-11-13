import "server-only";
import { createHash } from "node:crypto";
import { Chess } from "chess.js";
import { getDb } from "@/lib/db/mongodb";

interface SharedReplayDoc {
  _id: string;
  moves: string[];
  /** Who made the link. Never shown to visitors. */
  createdBy: string;
  createdAt: Date;
}

export const SHARE_ID = /^[A-Za-z0-9_-]{12}$/;
const MAX_MOVES = 400;

async function collection() {
  const db = await getDb();
  return db.collection<SharedReplayDoc>("shared_replays");
}

async function ready() {
  const docs = await collection();
  if (!indexReady) {
    indexReady = true;
    await docs.createIndex({ createdBy: 1, createdAt: -1 }).catch(() => undefined);
  }
  return docs;
}

let indexReady = false;
const MAX_LINKS_PER_USER = 100;

/**
 * Makes a public link for a game. The link holds only the moves, nothing about the player.
 * The same game always gives the same link, so sharing twice never makes a copy.
 */
export async function createSharedReplay(userId: string, moves: string[]): Promise<string> {
  if (moves.length === 0 || moves.length > MAX_MOVES) throw new Error("Invalid game");
  // Every move must be legal, so nobody can publish junk through this route.
  const game = new Chess();
  const clean: string[] = [];
  for (const move of moves) {
    try {
      clean.push(game.move(move).san);
    } catch {
      throw new Error("Invalid game");
    }
  }
  // The link belongs to the person who made it, so deleting it never breaks someone else's link to the same game.
  const id = createHash("sha256").update(`${userId}|${clean.join(" ")}`).digest("base64url").slice(0, 12);
  const docs = await ready();
  if (!(await docs.findOne({ _id: id }, { projection: { _id: 1 } })) && (await docs.countDocuments({ createdBy: userId })) >= MAX_LINKS_PER_USER) {
    throw new Error("Too many links");
  }
  await docs.updateOne({ _id: id }, { $setOnInsert: { moves: clean, createdBy: userId, createdAt: new Date() } }, { upsert: true });
  return id;
}

export async function getSharedReplay(id: string): Promise<string[] | null> {
  if (!SHARE_ID.test(id)) return null;
  const doc = await (await collection()).findOne({ _id: id }, { projection: { moves: 1 } });
  return doc?.moves ?? null;
}

export interface MySharedLink {
  id: string;
  moves: number;
  createdAt: string;
}

export async function listSharedReplays(userId: string): Promise<MySharedLink[]> {
  const rows = await (await ready()).find({ createdBy: userId }, { projection: { moves: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(MAX_LINKS_PER_USER).toArray();
  return rows.map((row) => ({ id: row._id, moves: row.moves.length, createdAt: row.createdAt.toISOString() }));
}

/** Deletes a link. Only the person who made it (or the owner of the site) can do this. */
export async function deleteSharedReplay(id: string, userId: string, isOwner: boolean): Promise<boolean> {
  if (!SHARE_ID.test(id)) return false;
  const filter = isOwner ? { _id: id } : { _id: id, createdBy: userId };
  const result = await (await ready()).deleteOne(filter);
  return result.deletedCount === 1;
}
