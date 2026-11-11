import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";

/** What the owner panel may see. No email addresses, no sign-in IDs. */
export interface AdminUser {
  id: string;
  username: string;
  createdAt: string;
  isOwner: boolean;
  isBeta: boolean;
  isPublic: boolean;
  avatarVersion: number | null;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listUsers(options: { search?: string; limit?: number } = {}): Promise<{ users: AdminUser[]; betaCount: number; total: number }> {
  const db = await getDb();
  const profiles = db.collection("profiles");
  const search = options.search?.trim().slice(0, 30);
  const filter = search ? { username: { $regex: escapeRegex(search), $options: "i" } } : {};

  const [docs, betaCount, total] = await Promise.all([
    profiles
      .find(filter, { projection: { username: 1, createdAt: 1, isOwner: 1, isBeta: 1, isPublic: 1, "avatar.updatedAt": 1 } })
      .sort({ createdAt: -1 })
      .limit(Math.min(options.limit ?? 50, 100))
      .toArray(),
    profiles.countDocuments({ isBeta: true }),
    profiles.estimatedDocumentCount(),
  ]);

  const users = docs.map((doc) => {
    const updatedAt = (doc.avatar as { updatedAt?: Date } | undefined)?.updatedAt;
    return {
      id: String(doc._id),
      username: String(doc.username ?? "Player"),
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : "",
      isOwner: doc.isOwner === true,
      isBeta: doc.isBeta === true,
      isPublic: doc.isPublic !== false,
      avatarVersion: updatedAt instanceof Date ? updatedAt.getTime() : null,
    };
  });
  return { users, betaCount, total };
}

export async function setBeta(id: string, beta: boolean): Promise<boolean> {
  if (!ObjectId.isValid(id) || String(new ObjectId(id)) !== id) return false;
  const db = await getDb();
  const result = await db.collection("profiles").updateOne({ _id: new ObjectId(id) }, { $set: { isBeta: beta } });
  return result.matchedCount === 1;
}
