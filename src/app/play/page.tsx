import type { Metadata } from "next";
import { PlayClient } from "@/components/chess/PlayClient";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Play — Checkm8",
};

export const dynamic = "force-dynamic";

interface PlayPageProps {
  searchParams: Promise<{ mode?: string; level?: string; color?: string }>;
}

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const params = await searchParams;
  const mode = params.mode === "pvp" ? "pvp" : "computer";
  const level = Math.min(4, Math.max(0, Number.parseInt(params.level ?? "1", 10) || 0));
  const color = params.color === "b" ? "b" : "w";
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
      <PlayClient loggedIn={Boolean(user)} initialMode={mode} initialLevel={level} initialColor={color} />
    </main>
  );
}
