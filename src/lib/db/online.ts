import "server-only";
import { Chess, type Square } from "chess.js";
import { ObjectId, type Collection } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { kFactor, ratingChange } from "@/lib/elo";
import { applyRatingDelta, countOnlineGame, getRatingInfo, incrementStats } from "@/lib/db/profiles";

/**
 * Online games between two signed-in users. The server is the referee: it replays every move with
 * chess.js, so a player can never make an illegal move or move for the other side.
 * Players find out about new moves by polling a small endpoint (serverless hosting has no sockets).
 */

export type Seat = "w" | "b";
type Result = "1-0" | "0-1" | "1/2-1/2";

interface OnlineGameDoc {
  _id: ObjectId;
  white: string | null;
  black: string | null;
  whiteName: string;
  blackName: string;
  status: "waiting" | "active" | "finished";
  /** SAN moves in order. */
  moves: string[];
  result: Result | null;
  reason: string | null;
  drawOffer: Seat | null;
  /** Rating points gained or lost by each side once the game has ended. */
  ratingDelta?: { w: number; b: number };
  /** When set, only this user can join (a challenge to a friend). Such games are not listed publicly. */
  invite?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  finishedAt?: Date;
}

/** What a browser may see: names and the viewer's own seat, never anyone's account ID. */
export interface OnlineGameView {
  id: string;
  status: OnlineGameDoc["status"];
  moves: string[];
  myColor: Seat | null;
  whiteName: string;
  blackName: string;
  result: Result | null;
  reason: string | null;
  drawOffer: Seat | null;
  version: number;
  canJoin: boolean;
  /** Rating points you gained or lost in this game (null until it is worked out). */
  myRatingChange: number | null;
}

export interface LobbyEntry {
  id: string;
  creatorName: string;
  creatorColor: Seat;
  mine: boolean;
  status: OnlineGameDoc["status"];
  opponentName: string | null;
  myColor: Seat | null;
  result: Result | null;
  updatedAt: string;
}

export class OnlineError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const WAIT_MS = 10 * 60_000;
const MAX_OPEN_PER_USER = 3;
const MAX_PLIES = 600;

let indexesReady: Promise<void> | undefined;

async function games(): Promise<Collection<OnlineGameDoc>> {
  const db = await getDb();
  const collection = db.collection<OnlineGameDoc>("online_games");
  indexesReady ??= Promise.all([
    collection.createIndex({ status: 1, createdAt: 1 }),
    collection.createIndex({ white: 1 }),
    collection.createIndex({ black: 1 }),
    // Old games clean themselves up after 30 days, which keeps storage small.
    collection.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 }),
  ])
    .then(() => undefined)
    .catch((error: unknown) => {
      indexesReady = undefined;
      throw error;
    });
  await indexesReady;
  return collection;
}

function objectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id ? new ObjectId(id) : null;
}

function seatOf(doc: OnlineGameDoc, userId: string): Seat | null {
  if (doc.white === userId) return "w";
  if (doc.black === userId) return "b";
  return null;
}

function toView(doc: OnlineGameDoc, userId: string): OnlineGameView {
  const myColor = seatOf(doc, userId);
  return {
    id: String(doc._id),
    status: doc.status,
    moves: doc.moves,
    myColor,
    whiteName: doc.whiteName,
    blackName: doc.blackName,
    result: doc.result,
    reason: doc.reason,
    drawOffer: doc.drawOffer,
    version: doc.version,
    myRatingChange: myColor && doc.ratingDelta ? doc.ratingDelta[myColor] : null,
    canJoin: doc.status === "waiting" && myColor === null && (!doc.invite || doc.invite === userId) && Date.now() - doc.createdAt.getTime() < WAIT_MS,
  };
}

async function assertRoom(userId: string): Promise<void> {
  const col = await games();
  const count = await col.countDocuments({
    status: { $in: ["waiting", "active"] },
    $or: [{ white: userId }, { black: userId }],
  });
  if (count >= MAX_OPEN_PER_USER) throw new OnlineError("You already have 3 open games. Finish or cancel one first.", 409);
}

/** Creates a game where the creator waits for an opponent. */
export async function createGame(userId: string, name: string, choice: Seat | "random", invite: string | null = null): Promise<string> {
  await assertRoom(userId);
  const col = await games();
  const color: Seat = choice === "random" ? (Math.random() < 0.5 ? "w" : "b") : choice;
  const now = new Date();
  const doc: Omit<OnlineGameDoc, "_id"> = {
    white: color === "w" ? userId : null,
    black: color === "b" ? userId : null,
    whiteName: color === "w" ? name : "Waiting…",
    blackName: color === "b" ? name : "Waiting…",
    status: "waiting",
    moves: [],
    result: null,
    reason: null,
    drawOffer: null,
    invite,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  const inserted = await col.insertOne(doc as OnlineGameDoc);
  return String(inserted.insertedId);
}

/** Takes the empty seat of a waiting game. The update is atomic, so two people can never take the same seat. */
async function takeSeat(filter: Record<string, unknown>, userId: string, name: string, allowInvite: boolean): Promise<OnlineGameDoc | null> {
  const col = await games();
  const now = new Date();
  return col.findOneAndUpdate(
    {
      ...filter,
      ...(allowInvite ? { $or: [{ invite: null }, { invite: userId }] } : { invite: null }),
      status: "waiting",
      createdAt: { $gt: new Date(Date.now() - WAIT_MS) },
      white: { $ne: userId },
      black: { $ne: userId },
    },
    [
      {
        $set: {
          whiteName: { $cond: [{ $eq: ["$white", null] }, name, "$whiteName"] },
          blackName: { $cond: [{ $eq: ["$black", null] }, name, "$blackName"] },
          white: { $ifNull: ["$white", userId] },
          black: { $ifNull: ["$black", userId] },
          status: "active",
          version: { $add: ["$version", 1] },
          updatedAt: now,
        },
      },
    ],
    { returnDocument: "after", sort: { createdAt: 1 } },
  );
}

/** Quick match: join someone who is waiting, or wait for the next person. */
export async function quickMatch(userId: string, name: string): Promise<string> {
  const col = await games();
  const mine = await col.findOne({ status: "waiting", invite: null, $or: [{ white: userId }, { black: userId }], createdAt: { $gt: new Date(Date.now() - WAIT_MS) } });
  if (mine) return String(mine._id);

  const joined = await takeSeat({}, userId, name, false);
  if (joined) return String(joined._id);
  return createGame(userId, name, "random");
}

export async function joinGame(id: string, userId: string, name: string): Promise<OnlineGameView> {
  const _id = objectId(id);
  if (!_id) throw new OnlineError("Game not found", 404);
  await assertRoom(userId);
  const joined = await takeSeat({ _id }, userId, name, true);
  if (!joined) throw new OnlineError("That game is no longer open.", 409);
  return toView(joined, userId);
}

export async function cancelGame(id: string, userId: string): Promise<void> {
  const _id = objectId(id);
  if (!_id) throw new OnlineError("Game not found", 404);
  const col = await games();
  await col.deleteOne({ _id, status: "waiting", $or: [{ white: userId }, { black: userId }] });
}

export async function lobby(userId: string): Promise<{ open: LobbyEntry[]; mine: LobbyEntry[]; challenges: LobbyEntry[] }> {
  const col = await games();
  const [openDocs, mineDocs, challengeDocs] = await Promise.all([
    col
      .find({ status: "waiting", invite: null, createdAt: { $gt: new Date(Date.now() - WAIT_MS) }, white: { $ne: userId }, black: { $ne: userId } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray(),
    col
      .find({ $or: [{ white: userId }, { black: userId }] })
      .sort({ updatedAt: -1 })
      .limit(8)
      .toArray(),
    col
      .find({ status: "waiting", invite: userId, createdAt: { $gt: new Date(Date.now() - WAIT_MS) } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
  ]);

  const entry = (doc: OnlineGameDoc): LobbyEntry => {
    const myColor = seatOf(doc, userId);
    const creatorColor: Seat = doc.white ? "w" : "b";
    return {
      id: String(doc._id),
      creatorName: creatorColor === "w" ? doc.whiteName : doc.blackName,
      creatorColor,
      mine: myColor !== null,
      status: doc.status,
      opponentName: myColor === null ? null : myColor === "w" ? doc.blackName : doc.whiteName,
      myColor,
      result: doc.result,
      updatedAt: doc.updatedAt.toISOString(),
    };
  };
  return { open: openDocs.map(entry), mine: mineDocs.map(entry), challenges: challengeDocs.map(entry) };
}

/** Returns the game, or null when nothing changed since `since` (so polling stays tiny). */
export async function getGame(id: string, userId: string, since?: number): Promise<OnlineGameView | null | "unchanged"> {
  const _id = objectId(id);
  if (!_id) return null;
  const col = await games();
  const doc = await col.findOne({ _id });
  if (!doc) return null;
  if (since !== undefined && since === doc.version) return "unchanged";
  return toView(doc, userId);
}

function describeEnd(chess: Chess, mover: Seat): { result: Result; reason: string } | null {
  if (chess.isCheckmate()) return { result: mover === "w" ? "1-0" : "0-1", reason: "checkmate" };
  if (chess.isStalemate()) return { result: "1/2-1/2", reason: "stalemate" };
  if (chess.isDraw()) return { result: "1/2-1/2", reason: "draw" };
  return null;
}

/** Adds the finished game to both players' stats and history. Runs once, by whoever ended the game. */
async function settle(doc: OnlineGameDoc): Promise<void> {
  if (!doc.white || !doc.black || !doc.result) return;
  const outcome = (seat: Seat) => (doc.result === "1/2-1/2" ? "draw" : (doc.result === "1-0") === (seat === "w") ? "win" : "loss");
  const stats = (seat: Seat) => {
    const o = outcome(seat);
    return { gamesPlayed: 1, gamesWon: o === "win" ? 1 : 0, gamesLost: o === "loss" ? 1 : 0, draws: o === "draw" ? 1 : 0 };
  };
  try {
    await Promise.all([incrementStats(doc.white, stats("w")), incrementStats(doc.black, stats("b"))]);

    // Elo: both ratings are read before either changes, so the two changes always match up.
    const [whiteInfo, blackInfo] = await Promise.all([getRatingInfo(doc.white), getRatingInfo(doc.black)]);
    const whiteScore = doc.result === "1-0" ? 1 : doc.result === "0-1" ? 0 : 0.5;
    const delta = {
      w: ratingChange(whiteInfo.rating, blackInfo.rating, whiteScore, kFactor(whiteInfo.ratingGames, whiteInfo.rating)),
      b: ratingChange(blackInfo.rating, whiteInfo.rating, 1 - whiteScore, kFactor(blackInfo.ratingGames, blackInfo.rating)),
    };
    await Promise.all([
      applyRatingDelta(doc.white, delta.w),
      applyRatingDelta(doc.black, delta.b),
      countOnlineGame(doc.white, outcome("w") === "win"),
      countOnlineGame(doc.black, outcome("b") === "win"),
    ]);
    // Show the change to both players. The version goes up so their next poll picks it up.
    const col = await games();
    await col.updateOne({ _id: doc._id }, { $set: { ratingDelta: delta }, $inc: { version: 1 } });
    const db = await getDb();
    const base = { moves: doc.moves.join(" "), result: doc.result, mode: "pvp", level: null, resigned: doc.reason === "resignation", plies: doc.moves.length, createdAt: new Date() };
    await db.collection("games").insertMany([
      { ...base, userId: doc.white, color: "w" },
      { ...base, userId: doc.black, color: "b" },
    ]);
  } catch (error) {
    console.error("Could not record an online game:", error instanceof Error ? error.name : "unknown");
  }
}

async function finish(doc: OnlineGameDoc, userId: string, result: Result, reason: string): Promise<OnlineGameView> {
  const col = await games();
  const updated = await col.findOneAndUpdate(
    { _id: doc._id, status: "active" },
    { $set: { status: "finished", result, reason, drawOffer: null, finishedAt: new Date(), updatedAt: new Date() }, $inc: { version: 1 } },
    { returnDocument: "after" },
  );
  if (!updated) throw new OnlineError("The game has already ended.", 409);
  await settle(updated);
  return toView(updated, userId);
}

async function loadActive(id: string, userId: string): Promise<{ doc: OnlineGameDoc; seat: Seat }> {
  const _id = objectId(id);
  if (!_id) throw new OnlineError("Game not found", 404);
  const col = await games();
  const doc = await col.findOne({ _id });
  if (!doc) throw new OnlineError("Game not found", 404);
  const seat = seatOf(doc, userId);
  if (!seat) throw new OnlineError("You are not playing in this game.", 403);
  if (doc.status !== "active") throw new OnlineError("This game is not active.", 409);
  return { doc, seat };
}

export async function playMove(
  id: string,
  userId: string,
  move: { from: string; to: string; promotion?: string },
  ply: number,
): Promise<OnlineGameView> {
  const { doc, seat } = await loadActive(id, userId);
  if (doc.moves.length !== ply) throw new OnlineError("The board changed. Try again.", 409);
  if (doc.moves.length >= MAX_PLIES) throw new OnlineError("This game is too long.", 409);

  const chess = new Chess();
  try {
    for (const san of doc.moves) chess.move(san);
  } catch {
    throw new OnlineError("This game is damaged.", 500);
  }
  if (chess.turn() !== seat) throw new OnlineError("It is not your turn.", 409);

  let san: string;
  try {
    san = chess.move({ from: move.from as Square, to: move.to as Square, promotion: move.promotion }).san;
  } catch {
    throw new OnlineError("That move is not legal.", 400);
  }

  const end = describeEnd(chess, seat);
  const now = new Date();
  const col = await games();
  const updated = await col.findOneAndUpdate(
    { _id: doc._id, status: "active", version: doc.version },
    {
      $push: { moves: san },
      $set: { drawOffer: null, updatedAt: now, ...(end ? { status: "finished" as const, result: end.result, reason: end.reason, finishedAt: now } : {}) },
      $inc: { version: 1 },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new OnlineError("The board changed. Try again.", 409);
  if (end) await settle(updated);
  return toView(updated, userId);
}

export async function resign(id: string, userId: string): Promise<OnlineGameView> {
  const { doc, seat } = await loadActive(id, userId);
  return finish(doc, userId, seat === "w" ? "0-1" : "1-0", "resignation");
}

export async function drawAction(id: string, userId: string, action: "offer" | "accept" | "decline"): Promise<OnlineGameView> {
  const { doc, seat } = await loadActive(id, userId);
  const opponent: Seat = seat === "w" ? "b" : "w";

  if (action === "accept") {
    if (doc.drawOffer !== opponent) throw new OnlineError("There is no draw offer to accept.", 409);
    return finish(doc, userId, "1/2-1/2", "agreement");
  }

  const col = await games();
  const next: Seat | null = action === "offer" ? seat : null;
  const updated = await col.findOneAndUpdate(
    { _id: doc._id, status: "active", version: doc.version },
    { $set: { drawOffer: next, updatedAt: new Date() }, $inc: { version: 1 } },
    { returnDocument: "after" },
  );
  if (!updated) throw new OnlineError("The board changed. Try again.", 409);
  return toView(updated, userId);
}

/** Number of friend challenges waiting for this user (for the notification dot). */
export async function countChallenges(userId: string): Promise<number> {
  const col = await games();
  return col.countDocuments({ status: "waiting", invite: userId, createdAt: { $gt: new Date(Date.now() - WAIT_MS) } });
}

/** The two account IDs of a game, for the chat permission check. Never sent to browsers. */
export async function getParticipants(id: string): Promise<{ white: string | null; black: string | null } | null> {
  const _id = objectId(id);
  if (!_id) return null;
  const col = await games();
  const doc = await col.findOne({ _id }, { projection: { white: 1, black: 1 } });
  return doc ? { white: doc.white, black: doc.black } : null;
}
