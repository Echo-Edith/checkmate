"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ChessGame, type FinishedGame } from "@/components/chess/ChessGame";
import { TutorMascot } from "@/components/tutor/TutorMascot";

interface PlayClientProps {
  loggedIn: boolean;
  initialMode?: "pvp" | "computer";
  initialLevel?: number;
  initialColor?: "w" | "b";
}

export function PlayClient({ loggedIn, initialMode, initialLevel, initialColor }: PlayClientProps) {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleFinished = useCallback(
    async (game: FinishedGame) => {
      if (!loggedIn) {
        setSaveMessage("Log in to save your games and track your statistics.");
        return;
      }
      setSaveMessage("Saving game…");
      try {
        const response = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moves: game.moves.map((move) => move.san),
            color: game.playerColor,
            mode: game.mode,
            level: game.level,
            resigned: game.resigned,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setSaveMessage(response.ok ? "Game saved to your profile." : (data.error ?? "Could not save the game."));
      } catch {
        setSaveMessage("Could not save the game. Check your connection.");
      }
    },
    [loggedIn],
  );

  return (
    <div className="space-y-3">
      {saveMessage && (
        <p role="status" className="mx-auto max-w-[680px] rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          {saveMessage}{" "}
          {loggedIn && saveMessage.startsWith("Game saved") && (
            <Link href="/analyze" className="underline">
              Analyse it
            </Link>
          )}
        </p>
      )}
      <ChessGame
        initialMode={initialMode}
        initialLevel={initialLevel}
        initialColor={initialColor}
        onGameFinished={handleFinished}
        renderOverlay={({ fen, lastMoveSan, getEngineFacts }) => (
          <TutorMascot fen={fen} lastMoveSan={lastMoveSan} loggedIn={loggedIn} getEngineFacts={getEngineFacts} />
        )}
      />
    </div>
  );
}
