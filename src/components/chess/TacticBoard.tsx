"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Color, type Square } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { parseUci } from "@/lib/chess-utils";
import { evaluateAttempt } from "@/lib/content/verify";

export type TacticStatus = "playing" | "solved" | "failed";

interface TacticBoardProps {
  fen: string;
  lines: readonly (readonly string[])[];
  mateAny?: boolean;
  /** Called once when the position is solved, with the player's moves (UCI). */
  onSolved?: (moves: string[]) => void;
  /** Called once when the player makes a wrong move. */
  onFailed?: (moves: string[]) => void;
  /** Shown in the status box when the position is solved. */
  solvedMessage?: string;
}

/**
 * Interactive practice position. The player moves, the board checks the move against the
 * accepted solution lines and plays the scripted reply. Mount it with a `key` to reset.
 */
export function TacticBoard({ fen, lines, mateAny, onSolved, onFailed, solvedMessage }: TacticBoardProps) {
  const [history, setHistory] = useState<string[]>([]);
  const [userMoves, setUserMoves] = useState<string[]>([]);
  const [status, setStatus] = useState<TacticStatus>("playing");
  const [waiting, setWaiting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playerColor: Color = fen.split(" ")[1] === "b" ? "b" : "w";

  const game = useMemo(() => {
    const instance = new Chess(fen);
    for (const uci of history) {
      const move = parseUci(uci);
      if (move) instance.move(move);
    }
    return instance;
  }, [fen, history]);

  const lastMove = useMemo(() => {
    const last = history[history.length - 1];
    const parsed = last ? parseUci(last) : null;
    return parsed ? { from: parsed.from, to: parsed.to } : null;
  }, [history]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleMove = useCallback(
    (from: Square, to: Square) => {
      if (status !== "playing" || waiting) return;
      const candidates = game.moves({ square: from, verbose: true }).filter((move) => move.to === to);
      const first = candidates[0];
      if (!first) return;
      // Promotion in tactics is almost always to a queen.
      const uci = `${from}${to}${first.promotion ? "q" : ""}`;
      const nextUser = [...userMoves, uci];
      const result = evaluateAttempt(fen, lines, nextUser, mateAny);

      if (result.status === "invalid") return;

      setHistory((h) => [...h, uci]);
      setUserMoves(nextUser);

      if (result.status === "wrong") {
        setStatus("failed");
        onFailed?.(nextUser);
      } else if (result.status === "solved") {
        setStatus("solved");
        onSolved?.(nextUser);
      } else if (result.reply) {
        const reply = result.reply;
        setWaiting(true);
        timer.current = setTimeout(() => {
          setHistory((h) => [...h, reply]);
          setWaiting(false);
        }, 250);
      }
    },
    [status, waiting, game, userMoves, fen, lines, mateAny, onFailed, onSolved],
  );

  function retry() {
    if (timer.current) clearTimeout(timer.current);
    setHistory([]);
    setUserMoves([]);
    setStatus("playing");
    setWaiting(false);
    setAttempt((n) => n + 1);
  }

  return (
    <div className="w-full max-w-[600px] space-y-3">
      <ChessBoard
        key={attempt}
        game={game}
        orientation={playerColor}
        interactive={status === "playing" && !waiting && game.turn() === playerColor}
        lastMove={lastMove}
        onMove={handleMove}
      />
      <div role="status" aria-live="polite" className="text-sm font-medium">
        {status === "playing" && (
          <span style={{ color: "var(--muted)" }}>{playerColor === "w" ? "White" : "Black"} to move</span>
        )}
        {status === "solved" && (
          <span style={{ color: "var(--accent)" }}>{solvedMessage ?? "Correct! Well done."}</span>
        )}
        {status === "failed" && (
          <span className="flex items-center gap-3">
            <span className="text-red-500">Not quite. That move does not work.</span>
            <button
              type="button"
              onClick={retry}
              className="rounded-md border px-3 py-1 text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              Try again
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
