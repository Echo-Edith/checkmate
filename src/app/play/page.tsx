import type { Metadata } from "next";
import { PlayClient } from "@/components/chess/PlayClient";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Play — Checkm8",
};

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Play</h1>
      <PlayClient loggedIn={Boolean(user)} />
    </main>
  );
}
