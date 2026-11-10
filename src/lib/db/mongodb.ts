import "server-only";
import { MongoClient, type Db } from "mongodb";

const DB_NAME = "checkm8";

/**
 * Reusable MongoDB connection.
 * The client promise is cached on globalThis so dev hot reloads and serverless
 * invocations reuse one connection instead of opening a new one each time.
 */
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing environment variable MONGODB_URI. Add it to .env.local and to Vercel project settings (server-side only).",
    );
  }

  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    globalForMongo._mongoClientPromise = client.connect().catch((error: unknown) => {
      // Allow a retry on the next call instead of caching a rejected promise.
      globalForMongo._mongoClientPromise = undefined;
      // Log the failure type only; never log the connection string.
      console.error("MongoDB connection failed:", error instanceof Error ? error.name : "unknown error");
      throw new Error("Could not connect to the database.");
    });
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}
