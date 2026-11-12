import type { Metadata } from "next";
import { FriendsPanel } from "@/components/friends/FriendsPanel";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Friends — Checkm8" };
export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  await requireUser();
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Friends</h1>
      <FriendsPanel />
    </main>
  );
}
