import "server-only";
import { ObjectId } from "mongodb";
import { badgesFor, type BadgeId } from "@/lib/badges";
import { getDb } from "@/lib/db/mongodb";

/** Friends are stored as one document per pair. IDs shown to browsers are public profile IDs, never account IDs. */
interface FriendshipDoc {
  _id: ObjectId;
  /** The two account IDs, sorted, so each pair exists once. */
  a: string;
  b: string;
  requester: string;
  status: "pending" | "accepted";
  createdAt: Date;
}

export interface Person {
  id: string;
  username: string;
  avatarVersion: number | null;
  badges: BadgeId[];
}

export class FriendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const MAX_FRIENDS = 200;
const MAX_OUTGOING = 50;

let indexesReady: Promise<void> | undefined;

async function friendships() {
  const db = await getDb();
  const collection = db.collection<FriendshipDoc>("friendships");
  indexesReady ??= Promise.all([
    collection.createIndex({ a: 1, b: 1 }, { unique: true }),
    collection.createIndex({ b: 1 }),
  ])
    .then(() => undefined)
    .catch((error: unknown) => {
      indexesReady = undefined;
      throw error;
    });
  await indexesReady;
  return collection;
}

function pair(x: string, y: string): { a: string; b: string } {
  return x < y ? { a: x, b: y } : { a: y, b: x };
}

/** Turns a public profile ID into the account ID. Server only. */
export async function publicIdToUserId(publicId: string): Promise<string | null> {
  if (!ObjectId.isValid(publicId) || String(new ObjectId(publicId)) !== publicId) return null;
  const db = await getDb();
  const doc = await db.collection("profiles").findOne({ _id: new ObjectId(publicId) }, { projection: { userId: 1 } });
  return typeof doc?.userId === "string" ? doc.userId : null;
}

async function peopleByUserId(userIds: string[]): Promise<Map<string, Person>> {
  const map = new Map<string, Person>();
  if (userIds.length === 0) return map;
  const db = await getDb();
  const docs = await db
    .collection("profiles")
    .find({ userId: { $in: userIds } }, { projection: { userId: 1, username: 1, isOwner: 1, isBeta: 1, "avatar.updatedAt": 1 } })
    .toArray();
  for (const doc of docs) {
    const updatedAt = (doc.avatar as { updatedAt?: Date } | undefined)?.updatedAt;
    map.set(String(doc.userId), {
      id: String(doc._id),
      username: String(doc.username ?? "Player"),
      avatarVersion: updatedAt instanceof Date ? updatedAt.getTime() : null,
      badges: badgesFor({ isOwner: doc.isOwner === true, isBeta: doc.isBeta === true }),
    });
  }
  return map;
}

export async function overview(userId: string): Promise<{ friends: Person[]; incoming: Person[]; outgoing: Person[] }> {
  const col = await friendships();
  const docs = await col
    .find({ $or: [{ a: userId }, { b: userId }] })
    .sort({ createdAt: -1 })
    .limit(MAX_FRIENDS + MAX_OUTGOING + 50)
    .toArray();
  const other = (doc: FriendshipDoc) => (doc.a === userId ? doc.b : doc.a);
  const people = await peopleByUserId(docs.map(other));

  const friends: Person[] = [];
  const incoming: Person[] = [];
  const outgoing: Person[] = [];
  for (const doc of docs) {
    const person = people.get(other(doc));
    if (!person) continue;
    if (doc.status === "accepted") friends.push(person);
    else if (doc.requester === userId) outgoing.push(person);
    else incoming.push(person);
  }
  friends.sort((x, y) => x.username.localeCompare(y.username));
  return { friends, incoming, outgoing };
}

export type FriendStatus = "self" | "none" | "friends" | "incoming" | "outgoing";

export async function statusWith(userId: string, targetUserId: string): Promise<FriendStatus> {
  if (userId === targetUserId) return "self";
  const col = await friendships();
  const doc = await col.findOne(pair(userId, targetUserId));
  if (!doc) return "none";
  if (doc.status === "accepted") return "friends";
  return doc.requester === userId ? "outgoing" : "incoming";
}

export async function areFriends(x: string, y: string): Promise<boolean> {
  return (await statusWith(x, y)) === "friends";
}

export async function sendRequest(userId: string, targetUserId: string): Promise<"requested" | "accepted"> {
  if (userId === targetUserId) throw new FriendError("You cannot add yourself.", 400);
  const col = await friendships();
  const existing = await col.findOne(pair(userId, targetUserId));
  if (existing) {
    if (existing.status === "accepted") throw new FriendError("You are already friends.", 409);
    if (existing.requester === userId) throw new FriendError("You already sent a request.", 409);
    // They asked first, so asking back means yes.
    await col.updateOne({ _id: existing._id }, { $set: { status: "accepted" } });
    return "accepted";
  }
  const [friendCount, outgoingCount] = await Promise.all([
    col.countDocuments({ $or: [{ a: userId }, { b: userId }], status: "accepted" }),
    col.countDocuments({ requester: userId, status: "pending" }),
  ]);
  if (friendCount >= MAX_FRIENDS) throw new FriendError("Your friend list is full.", 409);
  if (outgoingCount >= MAX_OUTGOING) throw new FriendError("Too many pending requests. Wait for answers first.", 409);
  try {
    await col.insertOne({ ...pair(userId, targetUserId), requester: userId, status: "pending", createdAt: new Date() } as FriendshipDoc);
  } catch {
    throw new FriendError("Could not send the request.", 409);
  }
  return "requested";
}

export async function respond(userId: string, targetUserId: string, action: "accept" | "decline" | "remove"): Promise<void> {
  const col = await friendships();
  const key = pair(userId, targetUserId);
  if (action === "accept") {
    const result = await col.updateOne({ ...key, status: "pending", requester: targetUserId }, { $set: { status: "accepted" } });
    if (result.matchedCount === 0) throw new FriendError("There is no request to accept.", 404);
    return;
  }
  // Decline an incoming request, cancel one you sent, or remove a friend.
  await col.deleteOne(action === "remove" ? { ...key, status: "accepted" } : { ...key, status: "pending" });
}

export async function incomingCount(userId: string): Promise<number> {
  const col = await friendships();
  return col.countDocuments({ $or: [{ a: userId }, { b: userId }], status: "pending", requester: { $ne: userId } });
}
