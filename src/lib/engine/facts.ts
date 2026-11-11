import { Chess } from "chess.js";
import { parseUci, uciToSan } from "@/lib/chess-utils";
import { formatScore } from "@/lib/engine/eval";
import type { StockfishEngine } from "@/lib/engine/stockfish";

/** Engine facts sent to the AI tutor. Everything the tutor says about evaluations comes from here. */
export interface EngineFacts {
  evalText: string;
  bestMoveSan: string;
  line: string[];
  depth: number;
}

/** A short search (about half a second) is plenty for tutor facts and keeps answers quick. */
export async function getEngineFacts(engine: StockfishEngine, fen: string, movetime = 500): Promise<EngineFacts> {
  const result = await engine.analyze(fen, { movetime, skill: 20 });

  const game = new Chess(fen);
  const line: string[] = [];
  for (const uci of result.pv.slice(0, 6)) {
    const move = parseUci(uci);
    if (!move) break;
    try {
      line.push(game.move(move).san);
    } catch {
      break;
    }
  }

  return {
    evalText: formatScore(result.score),
    bestMoveSan: uciToSan(fen, result.bestMove) ?? line[0] ?? "",
    line,
    depth: Math.max(1, result.depth),
  };
}
