"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { winPercent } from "@/lib/engine/eval";
import { getEngineFacts as fetchEngineFacts, type EngineFacts } from "@/lib/engine/facts";
import { useStockfish } from "@/lib/engine/useStockfish";
import { useVoice } from "@/lib/useVoice";
import { SpeakerIcon } from "@/components/SpeakButton";

const PROMOTION_PIECES: readonly PromotionPiece[] = ["q", "r", "b", "n"];

type Mode = "pvp" | "computer";
type Tab = "moves" | "setup";

/** `ms` is the engine's thinking time. Short times keep the game snappy, and weaker levels play fast. */
const LEVELS = [
  { label: "Beginner", skill: 1, ms: 150 },
  { label: "Casual", skill: 6, ms: 250 },
  { label: "Club", skill: 12, ms: 400 },
  { label: "Strong", skill: 17, ms: 600 },
  { label: "Maximum", skill: 20, ms: 800 },
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
  initialMode?: Mode;
  /** Index into the difficulty list (0 = Beginner). */
  initialLevel?: number;
  initialColor?: Color;
  /** Called once when a game ends (checkmate, draw or resignation). */
  onGameFinished?: (game: FinishedGame) => void;
  /** Floating content (the tutor mascot) drawn on top of the page. */
  renderOverlay?: (context: {
    fen: string;
    /** Last move played, in SAN (for example "Nf3"), or null at the start. */
    lastMoveSan: string | null;
    /** Runs Stockfish on the current position. Resolves to null if the engine is unavailable. */
    getEngineFacts: () => Promise<EngineFacts | null>;
  }) => ReactNode;
}

export function ChessGame({ initialMode = "computer", initialLevel = 1, initialColor = "w", onGameFinished, renderOverlay }: ChessGameProps) {
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [orientation, setOrientation] = useState<Color>(initialMode === "computer" ? initialColor : "w");
  const [pending, setPending] = useState<{ from: Square; to: Square } | null>(null);
  const [tab, setTab] = useState<Tab>("moves");

  const [mode, setMode] = useState<Mode>(initialMode);
  const [playerColor, setPlayerColor] = useState<Color>(initialColor);
  const [levelIndex, setLevelIndex] = useState(Math.min(LEVELS.length - 1, Math.max(0, initialLevel)));
  const [resigned, setResigned] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<{ text: string; from: Square; to: Square } | null>(null);
  const [animate, setAnimate] = useState(true);
  const [hintBusy, setHintBusy] = useState(false);
  const [reported, setReported] = useState(false);

  const { status: engineStatus, error: engineError, engine } = useStockfish(true);
  const voice = useVoice();

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
  // How the game ended, from the player's side: Victory, Defeat or Draw (two-player games name the winner).
  const outcome = !status.over
    ? null
    : status.result === "draw"
      ? { title: "Draw", tone: "draw" as const }
      : mode === "pvp"
        ? { title: status.result === "w" ? "White wins" : "Black wins", tone: "win" as const }
        : status.result === playerColor
          ? { title: "Victory", tone: "win" as const }
          : { title: "Defeat", tone: "loss" as const };
  const isLatest = viewIndex === moves.length;
  const lastMove = viewIndex > 0 ? (moves[viewIndex - 1] ?? null) : null;
  const fen = game.fen();
  const fenRef = useRef(fen);
  fenRef.current = fen;

  /** Jump around the move list. Pieces snap into place instead of sliding. */
  const goTo = useCallback((next: number | ((current: number) => number)) => {
    setAnimate(false);
    setViewIndex(next);
  }, []);

  const commitMove = useCallback(
    (from: Square, to: Square, promotion?: PromotionPiece) => {
      try {
        const next = replay(moves);
        const made = next.move({ from, to, promotion });
        setAnimate(true);
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
      .analyze(game.fen(), { movetime: level.ms, skill: level.skill })
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
  }, [mode, engineStatus, resigned, isLatest, baseStatus.over, pending, game, playerColor, level.skill, level.ms, engine, commitMove]);

  // Clear the hint whenever the position changes.
  useEffect(() => {
    setHint(null);
  }, [fen]);

  // Say the result out loud when the game ends.
  const sayRef = useRef(voice.say);
  sayRef.current = voice.say;
  useEffect(() => {
    if (outcome && moves.length > 0) sayRef.current(`${outcome.title}. ${status.text}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.over]);

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
    // A second tap hides the hint.
    if (hint) {
      setHint(null);
      return;
    }
    const instance = engine.current;
    if (!instance || hintBusy) return;
    const asked = fen;
    setHintBusy(true);
    try {
      const result = await instance.analyze(asked, { movetime: 700, skill: 20 });
      // The position changed while the engine was thinking: this answer is out of date.
      if (fenRef.current !== asked) return;
      const move = parseUci(result.bestMove);
      const san = uciToSan(asked, result.bestMove);
      if (!move || !san) {
        setHint(null);
        return;
      }
      // Scores are from White's side. Turn them into "how good is this for the side to move".
      const mine = game.turn() === "w" ? winPercent(result.score) : 100 - winPercent(result.score);
      const verdict = mine >= 75 ? "You are clearly better." : mine >= 56 ? "You are a little better." : mine >= 44 ? "The position is balanced." : mine >= 25 ? "You are a little worse." : "This is a hard position.";
      const text = `Try ${san}. ${verdict}`;
      setHint({ text, from: move.from, to: move.to });
      voice.say(text);
    } catch {
      if (fenRef.current === asked) setHint(null);
    } finally {
      setHintBusy(false);
    }
  }

  const getEngineFacts = useCallback(async (): Promise<EngineFacts | null> => {
    const instance = engine.current;
    if (!instance || engineStatus !== "ready") return null;
    try {
      return await fetchEngineFacts(instance, fen);
    } catch {
      return null;
    }
  }, [engine, engineStatus, fen]);

  // Keyboard navigation through the move history.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "ArrowLeft") goTo((i) => Math.max(0, i - 1));
      else if (event.key === "ArrowRight") goTo((i) => Math.min(moves.length, i + 1));
      else if (event.key === "Home") goTo(0);
      else if (event.key === "End") goTo(moves.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moves.length, goTo]);

  const humanTurn = mode === "pvp" || game.turn() === playerColor;
  const interactive = isLatest && !status.over && pending === null && humanTurn && !thinking;
  const gameInProgress = moves.length > 0 && !status.over;

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
        onClick={() => goTo(index + 1)}
        className="rounded px-2 py-0.5 text-left text-sm"
        style={{ background: active ? "var(--accent)" : "transparent", color: active ? "var(--accent-fg)" : "inherit" }}
      >
        {move.san}
      </button>
    );
  }

  // One short line that always says what is happening, so nothing hides below the fold.
  const statusLine = thinking
    ? "Computer is thinking…"
    : mode === "computer" && engineStatus === "loading"
      ? "Loading chess engine…"
      : outcome
        ? outcome.title
        : status.text;

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "moves", label: "Moves" },
    { key: "setup", label: "Setup" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[auto_24rem] lg:items-start lg:justify-center">
      {/* Board column: sized to the screen so the board is large but never needs scrolling */}
      <div className="mx-auto space-y-2" style={{ width: "min(calc(100vw - 2rem), calc(100svh - 12rem), 680px)", minWidth: "17rem" }}>
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm font-medium"
          style={{ ...borderStyle, background: "var(--surface)" }}
        >
          <span>{statusLine}</span>
          {!isLatest && (
            <button type="button" onClick={() => goTo(moves.length)} className="text-xs underline" style={{ color: "var(--muted)" }}>
              Back to game
            </button>
          )}
        </div>

        {outcome && (
          <div className="card mascot-panel flex flex-wrap items-center gap-2 p-3">
            <div className="mb-1 w-full">
              <p
                className="text-3xl font-extrabold tracking-tight"
                style={{ color: outcome.tone === "win" ? "var(--accent)" : outcome.tone === "loss" ? "#ef4444" : "var(--muted)" }}
              >
                {outcome.title}
              </p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {status.text}
              </p>
            </div>
            <button type="button" className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold" onClick={() => startNewGame()}>
              Play again
            </button>
            {mode === "computer" && (
              <button type="button" className={buttonClass} style={borderStyle} onClick={() => startNewGame(playerColor === "w" ? "b" : "w")}>
                Switch sides
              </button>
            )}
            <Link href="/analyze" className={buttonClass} style={borderStyle}>
              Analyse
            </Link>
            <Link href="/dashboard" className={`${buttonClass} ml-auto`} style={borderStyle}>
              Menu
            </Link>
          </div>
        )}

        <ChessBoard
          game={game}
          orientation={orientation}
          interactive={interactive}
          lastMove={lastMove}
          onMove={handleMove}
          animate={animate}
          hint={hint ? { from: hint.from, to: hint.to } : null}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={buttonClass} style={borderStyle} disabled={viewIndex === 0} onClick={() => goTo((i) => Math.max(0, i - 1))} aria-label="Previous move">
            ‹
          </button>
          <button type="button" className={buttonClass} style={borderStyle} disabled={isLatest} onClick={() => goTo((i) => Math.min(moves.length, i + 1))} aria-label="Next move">
            ›
          </button>
          <button type="button" className={buttonClass} style={borderStyle} onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}>
            Flip
          </button>
          <button
            type="button"
            className={buttonClass}
            style={borderStyle}
            disabled={engineStatus !== "ready" || hintBusy || status.over || !humanTurn || !isLatest}
            onClick={requestHint}
          >
            {hintBusy ? "…" : hint ? "Hide hint" : "Best move"}
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
          {voice.supported && (
            <button
              type="button"
              className={`${buttonClass} inline-flex items-center gap-1.5`}
              style={borderStyle}
              aria-pressed={voice.enabled}
              onClick={() => voice.setEnabled(!voice.enabled)}
              title={voice.enabled ? "Voice is on" : "Voice is off"}
            >
              <SpeakerIcon off={!voice.enabled} />
              {voice.enabled ? "Voice on" : "Voice off"}
            </button>
          )}
          <button type="button" className={`${buttonClass} ml-auto`} style={{ ...borderStyle, background: "var(--accent)", color: "var(--accent-fg)" }} onClick={() => startNewGame()}>
            New game
          </button>
        </div>

        {hint && (
          <p className="rounded-md border px-3 py-2 text-sm" style={{ ...borderStyle, background: "var(--surface)" }}>
            {hint.text}
          </p>
        )}
        {engineStatus === "error" && (
          <p role="alert" className="text-xs text-red-500">
            {engineError} Try two-player mode in Setup.
          </p>
        )}
      </div>

      {/* Side panel: tabs keep moves, tutor and setup one tap away without long scrolling */}
      <aside className="card">
        <div className="flex border-b" style={borderStyle} role="tablist">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className="flex-1 px-3 py-2 text-sm font-medium"
              style={{
                borderBottom: `2px solid ${tab === item.key ? "var(--accent)" : "transparent"}`,
                color: tab === item.key ? "inherit" : "var(--muted)",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="h-72 overflow-y-auto p-3 lg:h-[min(36rem,calc(100svh-12rem))]">
          {tab === "moves" &&
            (rows.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                No moves yet.
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
            ))}

          {tab === "setup" && (
            <fieldset className="space-y-3 text-sm" disabled={gameInProgress}>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {gameInProgress ? "Locked during a game." : "Pick your opponent."}
              </p>
              <label className="flex items-center justify-between gap-2">
                Opponent
                <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="rounded-md border bg-transparent px-2 py-1" style={borderStyle}>
                  <option value="computer">Computer</option>
                  <option value="pvp">Two players</option>
                </select>
              </label>
              {mode === "computer" && (
                <>
                  <label className="flex items-center justify-between gap-2">
                    Difficulty
                    <select value={levelIndex} onChange={(e) => setLevelIndex(Number(e.target.value))} className="rounded-md border bg-transparent px-2 py-1" style={borderStyle}>
                      {LEVELS.map((item, index) => (
                        <option key={item.label} value={index}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    You play
                    <select value={playerColor} onChange={(e) => startNewGame(e.target.value as Color)} className="rounded-md border bg-transparent px-2 py-1" style={borderStyle}>
                      <option value="w">White</option>
                      <option value="b">Black</option>
                    </select>
                  </label>
                </>
              )}
            </fieldset>
          )}
        </div>
      </aside>

      {renderOverlay?.({ fen, lastMoveSan: lastMove?.san ?? null, getEngineFacts })}

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Choose promotion piece">
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
