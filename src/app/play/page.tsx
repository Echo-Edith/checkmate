import type { Metadata } from "next";
import Link from "next/link";
import { ChessGame } from "@/components/chess/ChessGame";

export const metadata: Metadata = {
  title: "Play — Checkm8",
};

export default function PlayPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Play</h1>
        <Link href="/" className="text-sm underline" style={{ color: "var(--muted)" }}>
          Home
        </Link>
      </header>
      <ChessGame />
    </main>
  );
}
