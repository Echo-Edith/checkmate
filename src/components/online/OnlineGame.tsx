"use client";

import { Chess, type Square } from "chess.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatBox } from "@/components/chat/ChatBox";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { pieceGlyph, pieceStyle } from "@/components/chess/pieces";
import type { OnlineGameView } from "@/lib/db/online";
import { playSound, soundForSan } from "@/lib/sounds";

const REASONS: Record<string, string> = {
  checkmate: "Checkmate",
  stalemate: "Stalemate",
  draw: "Draw",
  resignation: "Resignation",
  agreement: "Draw by agreement",
};

function buildGame(moves: string[]): Chess {
  const chess = new Chess();
  try {
    for (const san of moves) chess.move(san);
  } catch {
    // A damaged move list would show the position up to that point.
  }
  return chess;
}

export function OnlineGame({ id }: { id: string }) {
  const router = useRouter();
  const [view, setView] = useState<OnlineGameView | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string[] | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const viewRef = useRef<OnlineGameView | null>(null);
  viewRef.current = view;

  const accept = useCallback((next: OnlineGameView) => {
    setView((current) => (current && next.version < current.version ? current : next));
  }, []);

  // Poll for changes. The server answers "unchanged" in a few bytes, so this stays cheap.
  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    async function tick() {
      let delay = 1500;
      try {
        if (document.hidden) {
          delay = 5000;
        } else {
          const version = viewRef.current?.version;
          const response = await fetch(`/api/online/games/${id}${version !== undefined ? `?v=${version}` : ""}`, { cache: "no-store" });
          if (response.status === 404) {
            setMissing(true);
            return;
          }
          if (response.ok) {
            const data = (await response.json()) as { unchanged?: boolean; game?: OnlineGameView };
            if (data.game && !stopped) accept(data.game);
          } else {
            delay = 4000;
          }
        }
      } catch {
        delay = 4000;
      }
      if (!stopped) timer = window.setTimeout(tick, viewRef.current?.status === "finished" ? 6000 : delay);
    }
    void tick();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [id, accept]);

  const moves = pending ?? view?.moves ?? [];
  const chess = useMemo(() => buildGame(moves), [moves]);
  const history = useMemo(() => chess.history({ verbose: true }), [chess]);
  const last = history[history.length - 1];
  const lastMove = last ? { from: last.from, to: last.to } : null;

  // Sound for every new move, mine and my opponent's. Moves that were already there when the page opened stay silent.
  const playedPlies = useRef<number | null>(null);
  const loaded = view !== null;
  useEffect(() => {
    if (!loaded) return;
    if (playedPlies.current === null) {
      playedPlies.current = moves.length;
      return;
    }
    if (moves.length > playedPlies.current) {
      const san = moves[moves.length - 1];
      if (san) playSound(soundForSan(san));
    }
    playedPlies.current = moves.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves.length, loaded]);

  // A ding when an opponent joins, and a result sound when the game ends.
  const previousStatus = useRef<OnlineGameView["status"] | null>(null);
  const status = view?.status ?? null;
  useEffect(() => {
    const before = previousStatus.current;
    previousStatus.current = status;
    if (!before || !view) return;
    if (before === "waiting" && status === "active") playSound("notify");
    if (before !== "finished" && status === "finished") {
      const timer = window.setTimeout(() => {
        window.dispatchEvent(new Event("checkm8:check-achievements"));
        if (view.result === "1/2-1/2") playSound("draw");
        else if (!view.myColor) playSound("draw");
        else playSound((view.result === "1-0") === (view.myColor === "w") ? "win" : "lose");
      }, 350);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(body: Record<string, unknown>): Promise<OnlineGameView | null> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/online/games/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { game?: OnlineGameView; error?: string };
      if (!response.ok || !data.game) throw new Error(data.error ?? "That did not work.");
      accept(data.game);
      return data.game;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submitMove(from: Square, to: Square, promo?: string) {
    if (!view) return;
    const preview = new Chess(chess.fen());
    let san: string;
    try {
      san = preview.move({ from, to, promotion: promo }).san;
    } catch {
      return;
    }
    // Show the move at once. The server confirms it a moment later.
    setPending([...view.moves, san]);
    const result = await act({ action: "move", from, to, promotion: promo, ply: view.moves.length });
    setPending(null);
    if (!result) {
      const response = await fetch(`/api/online/games/${id}`, { cache: "no-store" }).catch(() => null);
      const data = (await response?.json().catch(() => null)) as { game?: OnlineGameView } | null;
      if (data?.game) accept(data.game);
    }
  }

  function handleMove(from: Square, to: Square) {
    const candidate = chess.moves({ square: from, verbose: true }).find((move) => move.to === to);
    if (!candidate) return;
    if (candidate.promotion) setPromotion({ from, to });
    else void submitMove(from, to);
  }

  if (missing) {
    return (
      <p className="mt-6 text-sm" role="alert">
        This game was not found. It may have been cancelled.{" "}
        <Link href="/online" className="underline">
          Back to the lobby
        </Link>
      </p>
    );
  }
  if (!view) {
    return (
      <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>
        Loading game…
      </p>
    );
  }

  const myColor = view.myColor;
  const orientation = myColor ?? "w";
  const turn = chess.turn();
  const myTurn = view.status === "active" && myColor === turn;
  const interactive = myTurn && pending === null && promotion === null && !busy;
  const finished = view.status === "finished";

  let outcome: { title: string; tone: "win" | "loss" | "draw" } | null = null;
  if (finished && view.result) {
    if (view.result === "1/2-1/2") outcome = { title: "Draw", tone: "draw" };
    else if (!myColor) outcome = { title: view.result === "1-0" ? "White wins" : "Black wins", tone: "win" };
    else outcome = (view.result === "1-0") === (myColor === "w") ? { title: "Victory", tone: "win" } : { title: "Defeat", tone: "loss" };
  }

  const names = { w: view.whiteName, b: view.blackName };
  const top = orientation === "w" ? "b" : "w";
  const bottom = orientation;
  const strip = (seat: "w" | "b") => (
    <div className="flex items-center gap-2 px-1 text-sm">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: view.status === "active" && turn === seat ? "var(--accent)" : "var(--border)" }}
        aria-label={view.status === "active" && turn === seat ? "To move" : undefined}
      />
      <span translate="no" className="truncate font-medium">{names[seat]}</span>
      <span className="text-xs" style={{ color: "var(--muted)" }}>
        {seat === "w" ? "White" : "Black"}
        {myColor === seat && " · you"}
      </span>
    </div>
  );

  const statusText = finished
    ? REASONS[view.reason ?? ""] ?? "Game over"
    : view.status === "waiting"
      ? "Waiting for an opponent…"
      : myColor
        ? myTurn
          ? chess.isCheck()
            ? "Your move — check!"
            : "Your move"
          : "Opponent is thinking…"
        : `${turn === "w" ? "White" : "Black"} to move`;

  const offeredToMe = view.status === "active" && myColor !== null && view.drawOffer !== null && view.drawOffer !== myColor;
  const offeredByMe = view.status === "active" && myColor !== null && view.drawOffer === myColor;
  const buttonClass = "rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-40 pointer-coarse:px-3.5 pointer-coarse:py-2.5";
  const border = { borderColor: "var(--border)" } as const;

  const pairs: Array<[number, string, string | undefined]> = [];
  for (let i = 0; i < moves.length; i += 2) pairs.push([i / 2 + 1, moves[i] ?? "", moves[i + 1]]);

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[auto_20rem] lg:justify-center">
      <div className="board-col mx-auto space-y-2">
        {strip(top)}
        <ChessBoard game={chess} orientation={orientation} interactive={interactive} lastMove={lastMove} onMove={handleMove} pieceSets={{ w: view.whiteSet, b: view.blackSet }} />
        {strip(bottom)}
      </div>

      <aside className="card space-y-3 p-4 lg:self-start">
        {outcome && (
          <div>
            <p className="text-3xl font-extrabold tracking-tight" style={{ color: outcome.tone === "win" ? "var(--accent)" : outcome.tone === "loss" ? "#ef4444" : "var(--muted)" }}>
              {outcome.title}
            </p>
            {view.myRatingChange !== null && (
              <p className="text-sm font-semibold" style={{ color: view.myRatingChange >= 0 ? "var(--accent)" : "#ef4444" }}>
                Rating {view.myRatingChange >= 0 ? "+" : ""}
                {view.myRatingChange}
              </p>
            )}
          </div>
        )}
        <p role="status" className="text-sm font-medium">
          {statusText}
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}

        {view.canJoin && (
          <button type="button" disabled={busy} onClick={() => void act({ action: "join" })} className="btn-primary w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
            Join this game
          </button>
        )}

        {view.status === "waiting" && myColor && (
          <div className="space-y-2">
            <button
              type="button"
              className={`${buttonClass} w-full`}
              style={border}
              onClick={() => {
                void navigator.clipboard?.writeText(window.location.href).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? "Link copied!" : "Copy invite link"}
            </button>
            <button
              type="button"
              className={`${buttonClass} w-full`}
              style={border}
              onClick={async () => {
                await act({ action: "cancel" }).catch(() => null);
                router.push("/online");
              }}
            >
              Cancel game
            </button>
          </div>
        )}

        {view.status === "active" && myColor && (
          <div className="space-y-2">
            {offeredToMe && (
              <div className="rounded-md border p-2 text-sm" style={{ borderColor: "var(--accent)" }}>
                <p className="mb-2 font-medium">Your opponent offers a draw.</p>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} className="btn-primary rounded-md px-3 py-1.5 text-sm font-semibold" onClick={() => void act({ action: "accept_draw" })}>
                    Accept
                  </button>
                  <button type="button" disabled={busy} className={buttonClass} style={border} onClick={() => void act({ action: "decline_draw" })}>
                    Decline
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!offeredToMe && (
                <button type="button" disabled={busy || offeredByMe} className={buttonClass} style={border} onClick={() => void act({ action: "offer_draw" })}>
                  {offeredByMe ? "Draw offered…" : "Offer draw"}
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                className={buttonClass}
                style={border}
                onClick={() => {
                  if (window.confirm("Resign this game?")) void act({ action: "resign" });
                }}
              >
                Resign
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href="/online" className={buttonClass} style={border}>
            {finished ? "Back to lobby" : "Lobby"}
          </Link>
          {finished && (
            <Link href="/analyze" className={buttonClass} style={border}>
              Analyse
            </Link>
          )}
        </div>

        {myColor && view.status !== "waiting" && (
          <div className="border-t pt-3" style={border}>
            <p className="mb-2 text-sm font-semibold">Chat</p>
            <ChatBox scope="game" target={id} height="h-36" />
          </div>
        )}

        <div className="max-h-56 overflow-y-auto border-t pt-2 text-sm" style={border}>
          {pairs.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No moves yet.</p>
          ) : (
            <ol className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-0.5">
              {pairs.map(([number, white, black]) => (
                <li key={number} className="contents">
                  <span style={{ color: "var(--muted)" }}>{number}.</span>
                  <span>{white}</span>
                  <span>{black ?? ""}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>

      {promotion && myColor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Choose promotion piece">
          <div className="rounded-lg border p-4" style={{ ...border, background: "var(--background)" }}>
            <p className="mb-3 text-sm font-medium">Promote pawn to</p>
            <div className="flex gap-2">
              {(["q", "r", "b", "n"] as const).map((piece) => (
                <button
                  key={piece}
                  type="button"
                  className="grid h-14 w-14 place-items-center rounded-md border text-4xl"
                  style={{ ...border, background: "var(--sq-dark, #769656)" }}
                  onClick={() => {
                    const target = promotion;
                    setPromotion(null);
                    void submitMove(target.from, target.to, piece);
                  }}
                >
                  <span style={pieceStyle(myColor, myColor === "w" ? view.whiteSet : view.blackSet)}>{pieceGlyph(piece)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
