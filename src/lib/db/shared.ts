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
  const id = createHash("sha256").update(clean.join(" ")).digest("base64url").slice(0, 12);
  const docs = await collection();
  await docs.updateOne({ _id: id }, { $setOnInsert: { moves: clean, createdBy: userId, createdAt: new Date() } }, { upsert: true });
  return id;
}

export async function getSharedReplay(id: string): Promise<string[] | null> {
  if (!SHARE_ID.test(id)) return null;
  const doc = await (await collection()).findOne({ _id: id }, { projection: { moves: 1 } });
  return doc?.moves ?? null;
}
