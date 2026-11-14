"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChessGame, type FinishedGame } from "@/components/chess/ChessGame";
import { TutorMascot } from "@/components/tutor/TutorMascot";

interface PlayClientProps {
  loggedIn: boolean;
  initialMode?: "pvp" | "computer";
  initialLevel?: number;
  initialColor?: "w" | "b";
}

const PENDING_KEY = "checkm8:pending-games";
const MAX_PENDING = 5;

interface SavePayload {
  moves: string[];
  color: "w" | "b";
  mode: string;
  level: unknown;
  resigned: boolean;
}

function readPending(): SavePayload[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as SavePayload[]).slice(0, MAX_PENDING) : [];
  } catch {
    return [];
  }
}

function writePending(list: SavePayload[]) {
  try {
    if (list.length === 0) localStorage.removeItem(PENDING_KEY);
    else localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(0, MAX_PENDING)));
  } catch {
    // Storage can be blocked; offline games are then simply not kept.
  }
}

export function PlayClient({ loggedIn, initialMode, initialLevel, initialColor }: PlayClientProps) {
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Games finished while offline are saved the next time the connection is back.
  useEffect(() => {
    if (!loggedIn) return;
    let running = false;
    const flush = async () => {
      if (running || !navigator.onLine) return;
      running = true;
      try {
        let queue = readPending();
        while (queue.length > 0 && navigator.onLine) {
          const first = queue[0];
          let response: Response;
          try {
            response = await fetch("/api/games", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(first) });
          } catch {
            break;
          }
          // Drop the game once the server answered, either saved or rejected for good (not a server error).
          if (response.status >= 500 || response.status === 401 || response.status === 429) break;
          queue = queue.slice(1);
          writePending(queue);
          if (response.ok) setSaveMessage("A game you played offline was saved to your profile.");
        }
      } finally {
        running = false;
      }
    };
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [loggedIn]);

  const handleFinished = useCallback(
    async (game: FinishedGame) => {
      if (!loggedIn) {
        setSaveMessage("Log in to save your games and track your statistics.");
        return;
      }
      const payload: SavePayload = {
        moves: game.moves.map((move) => move.san),
        color: game.playerColor,
        mode: game.mode,
        level: game.level,
        resigned: game.resigned,
      };
      if (!navigator.onLine) {
        writePending([...readPending(), payload]);
        setSaveMessage("You are offline. Your game will be saved when you are back online.");
        return;
      }
      setSaveMessage("Saving game…");
      try {
        const response = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string; ratingDelta?: number | null };
        const rating = typeof data.ratingDelta === "number" ? ` Rating ${data.ratingDelta >= 0 ? "+" : ""}${data.ratingDelta}.` : "";
        setSaveMessage(response.ok ? `Game saved to your profile.${rating}` : (data.error ?? "Could not save the game."));
        if (response.ok) window.dispatchEvent(new Event("checkm8:check-achievements"));
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
