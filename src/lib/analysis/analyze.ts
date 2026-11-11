import { Chess, type Color, type Square } from "chess.js";
import { uciToSan } from "@/lib/chess-utils";
import { formatScore, winPercent } from "@/lib/engine/eval";
import type { EngineScore, StockfishEngine } from "@/lib/engine/stockfish";
import type { MoveClassification } from "@/lib/tutor/schema";

export interface PlyAnalysis {
  /** 1-based ply number. */
  ply: number;
  moveNumber: number;
  color: Color;
  san: string;
  from: Square;
  to: Square;
  fenBefore: string;
  fenAfter: string;
  classification: MoveClassification;
  /** Win-probability points lost by the mover (0-100). */
  loss: number;
  bestSan: string | null;
  evalBefore: string;
  evalAfter: string;
  /** The mover had a clearly better position (or a forced mate) and did not keep it. */
  missed: boolean;
}

export interface SideSummary {
  accuracy: number;
  counts: Record<MoveClassification, number>;
  missed: number;
}

export interface GameAnalysis {
  plies: PlyAnalysis[];
  /** White's win probability (0-100) at each position; index 0 is the start. */
  winPercents: number[];
  evalTexts: string[];
  white: SideSummary;
  black: SideSummary;
  resultText: string;
}

interface PositionInfo {
  fen: string;
  win: number;
  evalText: string;
  score: EngineScore | null;
  bestMove: string | null;
}

export function classify(loss: number, isBest: boolean): MoveClassification {
  if (isBest || loss < 0.5) return "best";
  if (loss < 5) return "good";
  if (loss < 10) return "inaccuracy";
  if (loss < 20) return "mistake";
  return "blunder";
}

/** Lichess-style accuracy from the average win-probability loss per move. */
function accuracyFromLoss(averageLoss: number): number {
  const value = 103.1668 * Math.exp(-0.04354 * averageLoss) - 3.1669;
  return Math.max(0, Math.min(100, value));
}

/** True if the engine sees a forced mate in favour of `color`. */
function hasForcedMate(score: EngineScore | null, color: Color): boolean {
  if (!score || score.mate === null) return false;
  return color === "w" ? score.mate > 0 : score.mate < 0;
}

function emptyCounts(): Record<MoveClassification, number> {
  return { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
}

export interface AnalyzeOptions {
  depth: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

/** Evaluates every position of a game with Stockfish. Throws "Analysis cancelled" if aborted. */
export async function analyzeGame(
  engine: StockfishEngine,
  sans: readonly string[],
  options: AnalyzeOptions,
): Promise<GameAnalysis> {
  const board = new Chess();
  const fens: string[] = [board.fen()];
  const moveInfos: Array<{ san: string; from: Square; to: Square; color: Color }> = [];
  for (const san of sans) {
    const color = board.turn();
    const move = board.move(san);
    moveInfos.push({ san: move.san, from: move.from, to: move.to, color });
    fens.push(board.fen());
  }

  const positions: PositionInfo[] = [];
  for (let i = 0; i < fens.length; i++) {
    if (options.signal?.aborted) throw new Error("Analysis cancelled");
    const fen = fens[i] ?? "";
    const game = new Chess(fen);

    if (game.isCheckmate()) {
      const whiteWins = game.turn() === "b";
      positions.push({ fen, win: whiteWins ? 100 : 0, evalText: "Checkmate", score: null, bestMove: null });
    } else if (game.isDraw() || game.isStalemate()) {
      positions.push({ fen, win: 50, evalText: "Draw", score: null, bestMove: null });
    } else {
      const result = await engine.analyze(fen, { depth: options.depth, skill: 20 });
      positions.push({
        fen,
        win: winPercent(result.score),
        evalText: formatScore(result.score),
        score: result.score,
        bestMove: result.bestMove,
      });
    }
    options.onProgress?.(i + 1, fens.length);
  }

  const plies: PlyAnalysis[] = [];
  const losses: Record<Color, number[]> = { w: [], b: [] };
  const white: SideSummary = { accuracy: 100, counts: emptyCounts(), missed: 0 };
  const black: SideSummary = { accuracy: 100, counts: emptyCounts(), missed: 0 };

  moveInfos.forEach((info, index) => {
    const before = positions[index];
    const after = positions[index + 1];
    if (!before || !after) return;

    const moverBefore = info.color === "w" ? before.win : 100 - before.win;
    const moverAfter = info.color === "w" ? after.win : 100 - after.win;
    const loss = Math.max(0, moverBefore - moverAfter);

    const bestSan = before.bestMove ? uciToSan(before.fen, before.bestMove) : null;
    const classification = classify(loss, bestSan !== null && bestSan === info.san);

    // Missed opportunity: the mover had a big edge or a forced mate and let it slip.
    const hadMate = hasForcedMate(before.score, info.color);
    const stillMate = hasForcedMate(after.score, info.color);
    const missed =
      classification !== "best" && classification !== "good" && ((hadMate && !stillMate) || moverBefore >= 70);

    losses[info.color].push(loss);
    const side = info.color === "w" ? white : black;
    side.counts[classification] += 1;
    if (missed) side.missed += 1;

    plies.push({
      ply: index + 1,
      moveNumber: Math.floor(index / 2) + 1,
      color: info.color,
      san: info.san,
      from: info.from,
      to: info.to,
      fenBefore: before.fen,
      fenAfter: after.fen,
      classification,
      loss,
      bestSan,
      evalBefore: before.evalText,
      evalAfter: after.evalText,
      missed,
    });
  });

  const average = (values: number[]): number =>
    values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
  white.accuracy = accuracyFromLoss(average(losses.w));
  black.accuracy = accuracyFromLoss(average(losses.b));

  const final = new Chess(fens[fens.length - 1] ?? undefined);
  const resultText = final.isCheckmate()
    ? `Checkmate — ${final.turn() === "w" ? "Black" : "White"} wins`
    : final.isDraw() || final.isStalemate()
      ? "Draw"
      : "Game not finished";

  return {
    plies,
    winPercents: positions.map((p) => p.win),
    evalTexts: positions.map((p) => p.evalText),
    white,
    black,
    resultText,
  };
}
