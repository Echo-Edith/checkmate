import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedReplay } from "@/components/analysis/SharedReplay";
import { getSharedReplay } from "@/lib/db/shared";

export const metadata: Metadata = { title: "Game replay — Checkm8", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function SharedReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let moves: string[] | null = null;
  try {
    moves = await getSharedReplay(id);
  } catch {
    moves = null;
  }
  if (!moves) return notFound();

  return (
    <main className="mx-auto min-w-0 max-w-5xl overflow-x-clip px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Game replay</h1>
      <p className="mb-6 mt-1 text-sm" style={{ color: "var(--muted)" }}>
        {Math.ceil(moves.length / 2)} moves. Press play, or drag the timeline.
      </p>
      <SharedReplay moves={moves} />
    </main>
  );
}
