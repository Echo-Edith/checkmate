import type { Metadata } from "next";
import { OnlineLobby } from "@/components/online/OnlineLobby";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Play online — Checkm8" };
export const dynamic = "force-dynamic";

export default async function OnlinePage() {
  await requireUser();
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Play online</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Play other people on Checkm8.
      </p>
      <OnlineLobby />
    </main>
  );
}
