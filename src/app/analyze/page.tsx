import type { Metadata } from "next";
import { AnalysisClient } from "@/components/analysis/AnalysisClient";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Analyse — Checkm8" };
export const dynamic = "force-dynamic";

export default async function AnalyzePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Game analysis</h1>
      <AnalysisClient loggedIn={Boolean(user)} />
    </main>
  );
}
