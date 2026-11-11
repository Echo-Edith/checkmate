import type { Metadata } from "next";
import { OnlineGame } from "@/components/online/OnlineGame";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Online game — Checkm8" };
export const dynamic = "force-dynamic";

export default async function OnlineGamePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return (
    <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
      <OnlineGame id={id} />
    </main>
  );
}
