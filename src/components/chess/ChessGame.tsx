"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Color, Square } from "chess.js";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { pieceGlyph, pieceStyle } from "@/components/chess/pieces";
import {
  getStatus,
  parseUci,
  replay,
  uciToSan,
  type PlayedMove,
  type PromotionPiece,
} from "@/lib/chess-utils";
import { formatScore } from "@/lib/engine/eval";
import { useStockfish } from "@/lib/engine/useStockfish";

const PROMOTION_PIECES: readonly PromotionPiece[] = ["q", "r", "b", "n"];

type Mode = "pvp" | "computer";

const LEVELS = [
  { label: "Beginner", skill: 1 },
  { label: "Casual", skill: 6 },
  { label: "Club", skill: 12 },
  { label: "Strong", skill: 17 },
  { label: "Maximum", skill: 20 },
] as const;

const buttonClass =
  "rounded-md border px-3 py-1.5 text-sm font-medium transition-opacity disabled:opacity-40";
const borderStyle = { borderColor: "var(--border)" } as const;

export interface FinishedGame {
  moves: PlayedMove[];
  playerColor: Color;
  mode: Mode;
  level: number | null;
  resigned: boolean;
}

interface ChessGameProps {
  /** Called once when a game ends (checkmate, draw or resignation). */
  onGameFinished?: (game: FinishedGame) => void;
  /** Extra content rendered under the controls (e.g. the AI tutor). */
  renderExtras?: (context: {
    fen: string;
    moves: readonly PlayedMove[];
    playerColor: Color;
    statusText: string;
  }) => ReactNode;
}

export function ChessGame({ onGameFinished, renderExtras }: ChessGameProps) {
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [orientation, setOrientation] = useState<Color>("w");
  const [pending, setPending] = useState<{ from: Square; to: Square } | null>(null);

  const [mode, setMode] = useState<Mode>("computer");
  const [playerColor, setPlayerColor] = useState<Color>("w");
  const [levelIndex, setLevelIndex] = useState(1);
  const [resigned, setResigned] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [reported, setReported] = useState(false);

  const { status: engineStatus, error: engineError, engine } = useStockfish(true);

  const level = LEVELS[levelIndex] ?? LEVELS[1];
  const game = useMemo(() => replay(moves, viewIndex), [moves, viewIndex]);
  const baseStatus = useMemo(() => getStatus(game), [game]);
  const status = resigned
    ? {
        over: true,
        result: playerColor === "w" ? ("b" as const) : ("w" as const),
        text: `You resigned — ${playerColor === "w" ? "Black" : "White"} wins`,
      }
    : baseStatus;
  const isLatest = viewIndex === moves.length;
  const lastMove = viewIndex > 0 ? (moves[viewIndex - 1] ?? null) : null;
  const fen = game.fen();

  const commitMove = useCallback(
    (from: Square, to: Square, promotion?: PromotionPiece) => {
      try {
        const next = replay(moves);
        const made = next.move({ from, to, promotion });
        setMoves([...moves, { from: made.from, to: made.to, san: made.san }]);
        setViewIndex(moves.length + 1);
      } catch {
        // Illegal move: ignore. The board only offers legal moves, so this is a safety net.
      }
      setPending(null);
    },
    [moves],
  );

  const handleMove = useCallback(
    (from: Square, to: Square) => {
      const candidates = replay(moves)
        .moves({ square: from, verbose: true })
        .filter((move) => move.to === to);
      if (candidates.length === 0) return;
      if (candidates.some((move) => move.promotion)) {
        setPending({ from, to });
        return;
      }
      commitMove(from, to);
    },
    [moves, commitMove],
  );

  // The computer replies when it is its turn.
  useEffect(() => {
    if (mode !== "computer" || engineStatus !== "ready" || resigned) return;
    if (!isLatest || baseStatus.over || pending) return;
    if (game.turn() === playerColor) return;

    const instance = engine.current;
    if (!instance) return;
    let cancelled = false;
    setThinking(true);

    instance
      .analyze(game.fen(), { movetime: 700, skill: level.skill })
      .then((result) => {
        if (cancelled) return;
        const move = parseUci(result.bestMove);
        if (move) commitMove(move.from, move.to, move.promotion);
        setThinking(false);
      })
      .catch(() => {
        if (!cancelled) setThinking(false);
      });

    return () => {
      cancelled = true;
      setThinking(false);
    };
  }, [mode, engineStatus, resigned, isLatest, baseStatus.over, pending, game, playerColor, level.skill, engine, commitMove]);

  // Clear the hint whenever the position changes.
  useEffect(() => {
    setHint(null);
  }, [fen]);

  // Report a finished game once.
  useEffect(() => {
    if (!status.over || reported || moves.length === 0) return;
    setReported(true);
    onGameFinished?.({
      moves,
      playerColor,
      mode,
      level: mode === "computer" ? level.skill : null,
      resigned,
    });
  }, [status.over, reported, moves, playerColor, mode, level.skill, resigned, onGameFinished]);

  function startNewGame(nextColor: Color = playerColor) {
    setMoves([]);
    setViewIndex(0);
    setPending(null);
    setResigned(false);
    setReported(false);
    setHint(null);
    setPlayerColor(nextColor);
    setOrientation(mode === "computer" ? nextColor : "w");
  }

  async function requestHint() {
    const instance = engine.current;
    if (!instance || hintBusy) return;
    setHintBusy(true);
    try {
      const result = await instance.analyze(fen, { depth: 12, skill: 20 });
      const san = uciToSan(fen, result.bestMove);
      setHint(san ? `Best move: ${san} (${formatScore(result.score)})` : "No hint available.");
    } catch {
      setHint("The engine could not analyse this position.");
    } finally {
      setHintBusy(false);
    }
  }

  // Keyboard navigation through the move history.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") setViewIndex((i) => Math.max(0, i - 1));
      else if (event.key === "ArrowRight") setViewIndex((i) => Math.min(moves.length, i + 1));
      else if (event.key === "Home") setViewIndex(0);
      else if (event.key === "End") setViewIndex(moves.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moves.length]);

  const humanTurn = mode === "pvp" || game.turn() === playerColor;
  const interactive = isLatest && !status.over && pending === null && humanTurn && !thinking;

  const rows: Array<{ number: number; white: PlayedMove | undefined; black: PlayedMove | undefined }> = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ number: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }

  function moveButton(move: PlayedMove | undefined, index: number) {
    if (!move) return <span />;
    const active = viewIndex === index + 1;
    return (
      <button
        type="button"
        onClick={() => setViewIndex(index + 1)}
        className="rounded px-2 py-0.5 text-left text-sm"
        style={{ background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "inherit" }}
      >
        {move.san}
      </button>
    );
  }

  const gameInProgress = moves.length > 0 && !status.over;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="w-full max-w-[600px]">
        <ChessBoard
          game={game}
          orientation={orientation}
          interactive={interactive}
          lastMove={lastMove}
          onMove={handleMove}
        />
      </div>

      <aside className="w-full max-w-[600px] space-y-4 lg:w-80">
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border p-4 text-sm font-medium"
          style={{ ...borderStyle, background: "var(--surface)" }}
        >
          {status.text}
          {thinking && (
            <p className="mt-1 text-xs font-normal" style={{ color: "var(--muted)" }}>
              Computer is thinking…
            </p>
          )}
          {!isLatest && (
            <p className="mt-1 text-xs font-normal" style={{ color: "var(--muted)" }}>
              Viewing move {viewIndex} of {moves.length}. Go to the last move to keep playing.
            </p>
          )}
          {mode === "computer" && engineStatus === "loading" && (
            <p className="mt-1 text-xs font-normal" style={{ color: "var(--muted)" }}>
              Loading chess engine…
            </p>
          )}
          {engineStatus === "error" && (
            <p role="alert" className="mt-1 text-xs font-normal text-red-500">
              {engineError} Switch to two-player mode, or check that the engine files were installed.
            </p>
          )}
        </div>

        <fieldset
          className="space-y-3 rounded-lg border p-3 text-sm"
          style={borderStyle}
          disabled={gameInProgress}
        >
          <legend className="px-1 text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Game setup {gameInProgress && "(locked during a game)"}
          </legend>
          <label className="flex items-center justify-between gap-2">
            Opponent
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="rounded-md border bg-transparent px-2 py-1"
              style={borderStyle}
            >
              <option value="computer">Computer</option>
              <option value="pvp">Two players</option>
            </select>
          </label>
          {mode === "computer" && (
            <>
              <label className="flex items-center justify-between gap-2">
                Difficulty
                <select
                  value={levelIndex}
                  onChange={(e) => setLevelIndex(Number(e.target.value))}
                  className="rounded-md border bg-transparent px-2 py-1"
                  style={borderStyle}
                >
                  {LEVELS.map((item, index) => (
                    <option key={item.label} value={index}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-2">
                You play
                <select
                  value={playerColor}
                  onChange={(e) => startNewGame(e.target.value as Color)}
                  className="rounded-md border bg-transparent px-2 py-1"
                  style={borderStyle}
                >
                  <option value="w">White</option>
                  <option value="b">Black</option>
                </select>
              </label>
            </>
          )}
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} style={borderStyle} disabled={viewIndex === 0} onClick={() => setViewIndex(0)} aria-label="First move">
            «
          </button>
          <button type="button" className={buttonClass} style={borderStyle} disabled={viewIndex === 0} onClick={() => setViewIndex((i) => Math.max(0, i - 1))} aria-label="Previous move">
            ‹
          </button>
          <button type="button" className={buttonClass} style={borderStyle} disabled={isLatest} onClick={() => setViewIndex((i) => Math.min(moves.length, i + 1))} aria-label="Next move">
            ›
          </button>
          <button type="button" className={buttonClass} style={borderStyle} disabled={isLatest} onClick={() => setViewIndex(moves.length)} aria-label="Last move">
            »
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} style={borderStyle} onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>
            Flip board
          </button>
          <button type="button" className={buttonClass} style={borderStyle} onClick={() => startNewGame()}>
            New game
          </button>
          <button
            type="button"
            className={buttonClass}
            style={borderStyle}
            disabled={engineStatus !== "ready" || hintBusy || status.over || !humanTurn || !isLatest}
            onClick={requestHint}
          >
            {hintBusy ? "Analysing…" : "Hint"}
          </button>
          <button
            type="button"
            className={buttonClass}
            style={borderStyle}
            disabled={mode !== "computer" || !gameInProgress}
            onClick={() => setResigned(true)}
          >
            Resign
          </button>
        </div>

        {hint && (
          <p className="rounded-lg border p-3 text-sm" style={{ ...borderStyle, background: "var(--surface)" }}>
            {hint}
          </p>
        )}

        <div
          className="max-h-60 overflow-y-auto rounded-lg border p-2"
          style={{ ...borderStyle, background: "var(--surface)" }}
        >
          {rows.length === 0 ? (
            <p className="p-2 text-sm" style={{ color: "var(--muted)" }}>
              Moves will appear here.
            </p>
          ) : (
            <div className="grid grid-cols-[2rem_1fr_1fr] items-center gap-y-0.5">
              {rows.map((row) => (
                <FragmentRow key={row.number} number={row.number}>
                  {moveButton(row.white, (row.number - 1) * 2)}
                  {moveButton(row.black, (row.number - 1) * 2 + 1)}
                </FragmentRow>
              ))}
            </div>
          )}
        </div>

        {renderExtras?.({ fen, moves, playerColor: mode === "computer" ? playerColor : game.turn(), statusText: status.text })}
      </aside>

      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose promotion piece"
        >
          <div className="rounded-lg border p-4" style={{ ...borderStyle, background: "var(--background)" }}>
            <p className="mb-3 text-sm font-medium">Promote pawn to</p>
            <div className="flex gap-2">
              {PROMOTION_PIECES.map((piece) => (
                <button
                  key={piece}
                  type="button"
                  onClick={() => commitMove(pending.from, pending.to, piece)}
                  className="flex h-16 w-16 items-center justify-center rounded-md border text-5xl leading-none"
                  style={{ ...borderStyle, background: "#769656", ...pieceStyle(game.turn()) }}
                  aria-label={`Promote to ${piece}`}
                >
                  {pieceGlyph(piece)}
                </button>
              ))}
              <button type="button" onClick={() => setPending(null)} className="rounded-md border px-3 text-sm" style={borderStyle}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FragmentRow({ number, children }: { number: number; children: ReactNode }) {
  return (
    <>
      <span className="pl-1 text-xs" style={{ color: "var(--muted)" }}>
        {number}.
      </span>
      {children}
    </>
  );
}
