"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { EvalGraph } from "@/components/analysis/EvalGraph";
import { ShareReplayButton } from "@/components/analysis/ShareReplayButton";
import { ReplayPanel, type ReplayStep } from "@/components/analysis/ReplayPanel";
import { analyzeGame, type GameAnalysis, type PlyAnalysis } from "@/lib/analysis/analyze";
import { factualNote, IMPORTANT, isFaithful, readMs, titleFor } from "@/lib/analysis/commentary";
import { createLiveSpeaker, speechSupported, stopSpeaking } from "@/lib/speech";
import { useStockfish } from "@/lib/engine/useStockfish";
import type { GameSummary } from "@/lib/db/games";
import { askTutor, TutorClientError } from "@/lib/tutor/client";
import { CLASSIFICATIONS, PERSONAS, type MoveClassification, type Persona } from "@/lib/tutor/schema";

const borderStyle = { borderColor: "var(--border)" } as const;

const BADGE: Record<MoveClassification, { label: string; color: string }> = {
  best: { label: "Best", color: "#16a34a" },
  good: { label: "Good", color: "#65a30d" },
  inaccuracy: { label: "Inaccuracy", color: "#ca8a04" },
  mistake: { label: "Mistake", color: "#ea580c" },
  blunder: { label: "Blunder", color: "#dc2626" },
};

interface AnalysisClientProps {
  loggedIn: boolean;
}

function parseMoves(text: string): string[] {
  const game = new Chess();
  game.loadPgn(text.trim());
  if ((game.header() as Record<string, string | null>).FEN) throw new Error("custom start");
  return game.history();
}

function resultLabel(game: GameSummary): string {
  if (game.result === "1/2-1/2") return "Draw";
  const whiteWon = game.result === "1-0";
  return (whiteWon && game.color === "w") || (!whiteWon && game.color === "b") ? "Win" : "Loss";
}

export function AnalysisClient({ loggedIn }: AnalysisClientProps) {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [moves, setMoves] = useState<string[] | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  // The engine starts only once a game is loaded (not for visitors who just open the page).
  const { status: engineStatus, error: engineError, engine } = useStockfish(moves !== null);
  const [depth, setDepth] = useState(12);

  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [selected, setSelected] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const [persona, setPersona] = useState<Persona>("analyst");
  const [explanation, setExplanation] = useState<{ ply: number | "summary"; text: string; checked: boolean } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [holdPly, setHoldPly] = useState<number | null>(null);
  const [autoCommentary, setAutoCommentary] = useState(true);
  const [voiceCommentary, setVoiceCommentary] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [showBetter, setShowBetter] = useState(false);
  const commentCache = useRef(new Map<number, { text: string; checked: boolean }>());
  const commentedRef = useRef(new Set<number>());
  const timers = useRef(new Set<number>());
  const selectedRef = useRef(0);
  const [explainBusy, setExplainBusy] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  useEffect(() => {
    if (!loggedIn) return;
    let active = true;
    fetch("/api/games")
      .then(async (response) => {
        const data = (await response.json()) as { games?: GameSummary[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Could not load your games.");
        if (active) setGames(data.games ?? []);
      })
      .catch((err: unknown) => {
        if (active) setGamesError(err instanceof Error ? err.message : "Could not load your games.");
      });
    return () => {
      active = false;
    };
  }, [loggedIn]);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    setCanSpeak(speechSupported());
    const pending = timers.current;
    return () => {
      stopSpeaking();
      pending.forEach((id) => window.clearTimeout(id));
      pending.clear();
    };
  }, []);
  useEffect(() => {
    selectedRef.current = selected;
    setShowBetter(false);
  }, [selected]);

  function resetResults() {
    abortRef.current?.abort();
    setAnalysis(null);
    setProgress(null);
    setSelected(0);
    setExplanation(null);
    setExplainError(null);
    setHoldPly(null);
    stopSpeaking();
    commentCache.current.clear();
    commentedRef.current.clear();
  }

  function loadPasted() {
    setInputError(null);
    resetResults();
    try {
      const parsedMoves = parseMoves(pasted);
      if (parsedMoves.length === 0) throw new Error("No moves found.");
      setMoves(parsedMoves);
    } catch {
      setMoves(null);
      setInputError("Could not read that game. Paste a PGN (from the normal starting position) or a list of moves such as: 1. e4 e5 2. Nf3 Nc6");
    }
  }

  async function loadSaved(id: string) {
    setInputError(null);
    resetResults();
    try {
      const response = await fetch(`/api/games/${id}`);
      const data = (await response.json()) as { game?: { moves: string[] }; error?: string };
      if (!response.ok || !data.game) throw new Error(data.error ?? "Could not load the game.");
      setMoves(data.game.moves);
    } catch (err) {
      setMoves(null);
      setInputError(err instanceof Error ? err.message : "Could not load the game.");
    }
  }

  async function runAnalysis() {
    const instance = engine.current;
    if (!instance || !moves) return;
    resetResults();
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress({ done: 0, total: moves.length + 1 });
    try {
      const result = await analyzeGame(instance, moves, {
        depth,
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setAnalysis(result);
      setSelected(result.plies.length);
    } catch (err) {
      if (!(err instanceof Error && err.message === "Analysis cancelled")) {
        setInputError("The analysis failed. Please try again.");
      }
    } finally {
      setProgress(null);
    }
  }

  const ply: PlyAnalysis | null = analysis && selected > 0 ? (analysis.plies[selected - 1] ?? null) : null;

  const boardGame = useMemo(() => {
    if (!moves) return new Chess();
    const game = new Chess();
    try {
      for (const san of moves.slice(0, selected)) game.move(san);
    } catch {
      // A damaged saved game: show the position reached so far instead of crashing the page.
    }
    return game;
  }, [moves, selected]);

  // Every move of the game with its squares, straight from chess.js (works before the engine analysis too).
  const steps = useMemo<ReplayStep[]>(() => {
    if (!moves) return [];
    const game = new Chess();
    const list: ReplayStep[] = [];
    try {
      for (const [index, san] of moves.entries()) {
        const made = game.move(san);
        list.push({ san: made.san, from: made.from, to: made.to, color: made.color, moveNumber: Math.floor(index / 2) + 1 });
      }
    } catch {
      // Stop at the first move that cannot be played.
    }
    return list;
  }, [moves]);
  const total = steps.length;

  const keyHandler = useCallback(
    (event: KeyboardEvent) => {
      if (total === 0) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.tagName === "SELECT")) return;
      if (event.key === "ArrowLeft") setSelected((s) => Math.max(0, s - 1));
      else if (event.key === "ArrowRight") setSelected((s) => Math.min(total, s + 1));
      else if (event.key === "Home") setSelected(0);
      else if (event.key === "End") setSelected(total);
    },
    [total],
  );
  useEffect(() => {
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [keyHandler]);

  /**
   * Gets the commentary for one move. The facts (classification, evaluations, better move) come from Stockfish.
   * The AI only puts them into words, and its answer is checked so it cannot add moves or numbers of its own.
   */
  async function commentOn(target: PlyAnalysis): Promise<{ text: string; checked: boolean }> {
    const saved = commentCache.current.get(target.ply);
    if (saved) return saved;
    let result = { text: factualNote(target), checked: false };
    if (loggedIn) {
      try {
        const answer = await askTutor({
          kind: "explain_move",
          persona,
          fen: target.fenBefore,
          move: {
            san: target.san,
            color: target.color,
            moveNumber: target.moveNumber,
            classification: target.classification,
            bestSan: target.bestSan ?? undefined,
            evalBefore: target.evalBefore,
            evalAfter: target.evalAfter,
          },
        });
        if (isFaithful(answer, target)) result = { text: answer, checked: true };
      } catch {
        // Fall back to the engine-only note above.
      }
    }
    commentCache.current.set(target.ply, result);
    return result;
  }

  /** A timeout that is cancelled if the page is closed. */
  function later(callback: () => void, ms: number) {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      callback();
    }, ms);
    timers.current.add(id);
  }

  function speakComment(text: string, onEnd: () => void) {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      onEnd();
    };
    createLiveSpeaker(done).finish(text);
    // If the browser never reports the end, do not leave the replay waiting.
    later(done, readMs(text) * 2);
  }

  /** Tap on a move: show the explanation for it (and read it if voice commentary is on). */
  async function explainMove(target: PlyAnalysis | null = ply) {
    if (!target) return;
    setSelected(target.ply);
    setExplainBusy(true);
    setExplainError(null);
    try {
      const comment = await commentOn(target);
      setExplanation({ ply: target.ply, ...comment });
      if (voiceCommentary && canSpeak && selectedRef.current === target.ply) speakComment(comment.text, () => undefined);
    } finally {
      setExplainBusy(false);
    }
  }

  /** Tap on a move number or the graph: go to that position, point out a mistake and explain it. */
  function tapMove(index: number) {
    setSelected(index);
    const target = index > 0 ? analysis?.plies[index - 1] : undefined;
    if (target && IMPORTANT.has(target.classification)) void explainMove(target);
  }

  // The better move, as squares on the position before the mistake (worked out by chess.js from the engine's move).
  const better = useMemo(() => {
    if (!ply || !ply.bestSan || ply.classification === "best" || ply.classification === "good") return null;
    try {
      const before = new Chess(ply.fenBefore);
      const made = before.move(ply.bestSan);
      return { game: new Chess(ply.fenBefore), hint: { from: made.from, to: made.to }, san: ply.bestSan };
    } catch {
      return null;
    }
  }, [ply]);

  // While the replay plays, stop at important moves and explain them.
  useEffect(() => {
    if (selected === 0) commentedRef.current.clear();
    if (!analysis || !autoCommentary || !playing || selected === 0) return;
    const target = analysis.plies[selected - 1];
    if (!target || !IMPORTANT.has(target.classification) || commentedRef.current.has(selected)) return;
    commentedRef.current.add(selected);
    const at = selected;
    setHoldPly(at);
    void (async () => {
      const comment = await commentOn(target);
      setExplanation({ ply: at, ...comment });
      const release = () => setHoldPly((current) => (current === at ? null : current));
      // The user may have moved on while the comment was being written.
      if (selectedRef.current !== at) return release();
      if (voiceCommentary && canSpeak) speakComment(comment.text, release);
      else later(release, readMs(comment.text));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, playing, analysis, autoCommentary]);

  // Moving to another move by hand cancels a comment that is being read.
  useEffect(() => {
    if (holdPly !== null && holdPly !== selected) {
      stopSpeaking();
      setHoldPly(null);
    }
  }, [selected, holdPly]);

  async function summarise() {
    if (!analysis) return;
    setExplainBusy(true);
    setExplainError(null);
    try {
      const counts: Record<string, number> = {};
      for (const key of CLASSIFICATIONS) {
        counts[`white ${key}`] = analysis.white.counts[key];
        counts[`black ${key}`] = analysis.black.counts[key];
      }
      const keyMoments = [...analysis.plies]
        .filter((p) => p.classification === "mistake" || p.classification === "blunder" || p.classification === "inaccuracy")
        .sort((a, b) => b.loss - a.loss)
        .slice(0, 6)
        .map((p) => ({
          moveNumber: p.moveNumber,
          color: p.color,
          san: p.san,
          classification: p.classification,
          bestSan: p.bestSan ?? undefined,
        }));
      const text = await askTutor({
          kind: "game_summary",
          persona,
          summary: {
            result: analysis.resultText,
            whiteAccuracy: Math.round(analysis.white.accuracy),
            blackAccuracy: Math.round(analysis.black.accuracy),
            counts,
            keyMoments,
          },
        });
      setExplanation({ ply: "summary", text, checked: true });
    } catch (err) {
      setExplainError(err instanceof TutorClientError ? err.message : "The tutor could not answer right now.");
    } finally {
      setExplainBusy(false);
    }
  }

  const analysing = progress !== null;

  return (
    <div className="min-w-0 space-y-8 overflow-x-clip">
      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-semibold">Paste a game</h2>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={5}
            placeholder="Paste a PGN or moves like: 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6"
            className="w-full rounded-md border bg-transparent p-2 text-sm"
            style={borderStyle}
            aria-label="Game moves or PGN"
          />
          <button
            type="button"
            onClick={loadPasted}
            disabled={!pasted.trim()}
            className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-40"
            style={borderStyle}
          >
            Load game
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold">Your saved games</h2>
          {!loggedIn ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              <Link href="/login" className="underline">
                Log in
              </Link>{" "}
              to see the games you played against the computer.
            </p>
          ) : gamesError ? (
            <p role="alert" className="text-sm text-red-500">
              {gamesError}
            </p>
          ) : games.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No saved games yet. Finish a game on the Play page and it will appear here.
            </p>
          ) : (
            <ul className="max-h-44 space-y-1 overflow-y-auto">
              {games.map((game) => (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => void loadSaved(game.id)}
                    className="flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left text-sm"
                    style={borderStyle}
                  >
                    <span>
                      {game.mode === "computer" ? resultLabel(game) : "Two players"} · {Math.ceil(game.plies / 2)} moves
                    </span>
                    <span style={{ color: "var(--muted)" }}>{new Date(game.createdAt).toLocaleDateString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {inputError && (
        <p role="alert" className="text-sm text-red-500">
          {inputError}
        </p>
      )}

      {moves && (
        <section className="flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm" style={{ ...borderStyle, background: "var(--surface)" }}>
          <span>
            Game loaded: <strong>{Math.ceil(moves.length / 2)} moves</strong>
          </span>
          <label className="flex items-center gap-2">
            Depth
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="rounded-md border bg-transparent px-2 py-1"
              style={borderStyle}
              disabled={analysing}
            >
              <option value={10}>Quick (10)</option>
              <option value={12}>Standard (12)</option>
              <option value={16}>Deep (16)</option>
            </select>
          </label>
          {analysing ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="rounded-md border px-3 py-1.5 font-medium" style={borderStyle}>
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void runAnalysis()}
              disabled={engineStatus !== "ready"}
              className="rounded-md px-4 py-1.5 font-medium text-[color:var(--accent-fg)] disabled:opacity-50"
              style={{ background: "var(--accent)" }}
            >
              {engineStatus === "loading" ? "Loading engine…" : "Analyse game"}
            </button>
          )}
          {engineStatus === "error" && (
            <span role="alert" className="text-red-500">
              {engineError}
            </span>
          )}
          {progress && (
            <span role="status" style={{ color: "var(--muted)" }}>
              Analysing position {progress.done} of {progress.total}…
            </span>
          )}
        </section>
      )}

      {moves && (
        <section className="space-y-6">
          {analysis && (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["White", analysis.white],
                ["Black", analysis.black],
              ] as const
            ).map(([name, side]) => (
              <div key={name} className="rounded-lg border p-4 text-sm" style={{ ...borderStyle, background: "var(--surface)" }}>
                <p className="flex items-baseline justify-between">
                  <span className="font-semibold">{name}</span>
                  <span className="text-xl font-semibold">{side.accuracy.toFixed(0)}% accuracy</span>
                </p>
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {CLASSIFICATIONS.map((key) => (
                    <li key={key} style={{ color: BADGE[key].color }}>
                      {BADGE[key].label}: {side.counts[key]}
                    </li>
                  ))}
                  <li>Missed chances: {side.missed}</li>
                </ul>
              </div>
            ))}
          </div>
          )}

          {analysis && <EvalGraph winPercents={analysis.winPercents} selected={selected} onSelect={tapMove} />}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="w-full min-w-0 max-w-[600px] space-y-3">
              <ReplayPanel key={moves.join(" ")} game={boardGame} steps={steps} selected={selected} onSelect={setSelected} hold={holdPly === selected}
                badMove={ply !== null && IMPORTANT.has(ply.classification)}
                overlay={showBetter && better ? { game: better.game, hint: better.hint, caption: `Better move: ${better.san}` } : null}
                onPlayingChange={setPlaying}
              />
              <ShareReplayButton moves={moves} loggedIn={loggedIn} />
              {better && (
                <button
                  type="button"
                  onClick={() => setShowBetter((on) => !on)}
                  aria-pressed={showBetter}
                  className="min-h-11 w-full rounded-xl border px-4 py-2 text-sm font-semibold"
                  style={{ borderColor: showBetter ? "#22c55e" : "var(--border)", touchAction: "manipulation" }}
                >
                  {showBetter ? "Back to the move played" : "Show the better move"}
                </button>
              )}
              {analysis && (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Evaluation: {analysis.evalTexts[selected] ?? "—"}
                </p>
              )}
            </div>

            <div className="w-full min-w-0 max-w-[600px] space-y-4 lg:w-96">
              {!analysis && (
                <>
                  <p className="rounded-lg border p-4 text-sm" style={{ ...borderStyle, background: "var(--surface)", color: "var(--muted)" }}>
                    Press Play to watch the game. Tap Analyse game above to also see mistakes, accuracy and the AI tutor.
                  </p>
                  <ol className="max-h-80 space-y-0.5 overflow-y-auto rounded-lg border p-2 text-sm" style={borderStyle} translate="no">
                    {steps.map((item, index) => (
                      <li key={index}>
                        <button
                          type="button"
                          onClick={() => setSelected(index + 1)}
                          className="flex min-h-9 w-full items-center rounded px-2 py-1 text-left"
                          style={{ background: selected === index + 1 ? "var(--surface)" : "transparent", fontWeight: selected === index + 1 ? 600 : 400 }}
                        >
                          {item.moveNumber}
                          {item.color === "w" ? "." : "..."} {item.san}
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              )}
              {analysis && (
              <>
              <div className="rounded-lg border p-4 text-sm" style={{ ...borderStyle, background: "var(--surface)" }}>
                {ply ? (
                  <>
                    <p className="font-semibold">
                      <span translate="no">
                        {ply.moveNumber}
                        {ply.color === "w" ? "." : "..."} {ply.san}
                      </span>{" "}
                      <span style={{ color: BADGE[ply.classification].color }}>{titleFor(ply.classification)}</span>
                    </p>
                    <p className="mt-1" style={{ color: "var(--muted)" }}>
                      Evaluation {ply.evalBefore} → {ply.evalAfter}
                    </p>
                    {ply.bestSan && ply.classification !== "best" && (
                      <p className="mt-1">
                        Engine preferred: <strong>{ply.bestSan}</strong>
                      </p>
                    )}
                    {ply.missed && <p className="mt-1 text-orange-500">Missed opportunity: you had a better position before this move.</p>}
                  </>
                ) : (
                  <p style={{ color: "var(--muted)" }}>Select a move to see the engine's verdict.</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-sm" role="group" aria-label="Commentary options">
                <button
                  type="button"
                  onClick={() => setAutoCommentary((on) => !on)}
                  aria-pressed={autoCommentary}
                  className="min-h-10 flex-1 rounded-lg border px-3 py-2 font-medium"
                  style={{ borderColor: autoCommentary ? "var(--accent)" : "var(--border)", background: autoCommentary ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent", touchAction: "manipulation" }}
                >
                  Auto commentary: {autoCommentary ? "on" : "off"}
                </button>
                {canSpeak && (
                  <button
                    type="button"
                    onClick={() => {
                      if (voiceCommentary) stopSpeaking();
                      setVoiceCommentary((on) => !on);
                    }}
                    aria-pressed={voiceCommentary}
                    className="min-h-10 flex-1 rounded-lg border px-3 py-2 font-medium"
                    style={{ borderColor: voiceCommentary ? "var(--accent)" : "var(--border)", background: voiceCommentary ? "color-mix(in srgb, var(--accent) 16%, transparent)" : "transparent", touchAction: "manipulation" }}
                  >
                    Voice: {voiceCommentary ? "on" : "off"}
                  </button>
                )}
              </div>
              {holdPly === selected && (!explanation || explanation.ply !== selected) && (
                <p role="status" className="text-sm" style={{ color: "var(--muted)" }}>
                  Thinking about this move…
                </p>
              )}

              <div className="space-y-2 rounded-lg border p-4 text-sm" style={borderStyle}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">AI tutor</h3>
                  <select
                    value={persona}
                    onChange={(e) => setPersona(e.target.value as Persona)}
                    className="rounded-md border bg-transparent px-2 py-1"
                    style={borderStyle}
                    aria-label="Tutor personality"
                  >
                    {PERSONAS.map((key) => (
                      <option key={key} value={key}>
                        {key[0]?.toUpperCase()}
                        {key.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                {loggedIn ? (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void explainMove(ply)} disabled={!ply || explainBusy} className="rounded-md border px-3 py-1.5 font-medium disabled:opacity-40" style={borderStyle}>
                      Explain this move
                    </button>
                    <button type="button" onClick={() => void summarise()} disabled={explainBusy} className="rounded-md border px-3 py-1.5 font-medium disabled:opacity-40" style={borderStyle}>
                      Game review
                    </button>
                  </div>
                ) : (
                  <p style={{ color: "var(--muted)" }}>
                    <Link href="/login" className="underline">
                      Log in
                    </Link>{" "}
                    to use the AI tutor.
                  </p>
                )}
                {explainBusy && <p style={{ color: "var(--muted)" }}>Thinking…</p>}
                {explainError && (
                  <p role="alert" className="text-red-500">
                    {explainError}
                  </p>
                )}
                {explanation && !explainBusy && (explanation.ply === "summary" || explanation.ply === selected) && (
                  <div className="space-y-1">
                    <p className="whitespace-pre-wrap leading-relaxed">{explanation.text}</p>
                    {explanation.ply !== "summary" && (
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {explanation.checked ? "Written by the AI tutor from Stockfish's numbers." : "From Stockfish's numbers."}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <ol className="max-h-80 space-y-0.5 overflow-y-auto rounded-lg border p-2 text-sm" style={borderStyle}>
                {analysis.plies.map((item) => (
                  <li key={item.ply}>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => tapMove(item.ply)}
                        className="flex min-h-9 min-w-0 flex-1 items-center justify-between rounded px-2 py-1 text-left"
                        style={{ background: selected === item.ply ? "var(--surface)" : "transparent", fontWeight: selected === item.ply ? 600 : 400 }}
                      >
                        <span translate="no">
                          {item.moveNumber}
                          {item.color === "w" ? "." : "..."} {item.san}
                        </span>
                        <span className="text-xs" style={{ color: BADGE[item.classification].color }}>
                          {titleFor(item.classification)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void explainMove(item)}
                        disabled={explainBusy}
                        aria-label={`Explain move ${item.moveNumber}${item.color === "w" ? "." : "..."} ${item.san}`}
                        className="min-h-9 shrink-0 rounded border px-2 text-xs font-medium disabled:opacity-40"
                        style={{ ...borderStyle, touchAction: "manipulation" }}
                      >
                        Explain
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
              </>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
