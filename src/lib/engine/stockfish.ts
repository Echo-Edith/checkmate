/**
 * Thin client-side wrapper around the Stockfish WASM Web Worker (UCI protocol).
 * Runs entirely in the browser; never import this from server code.
 */

const ENGINE_URL = "/stockfish/stockfish.js";

/** Score from White's point of view: centipawns, or moves-to-mate (positive = White mates). */
export interface EngineScore {
  cp: number | null;
  mate: number | null;
}

export interface EngineResult {
  bestMove: string;
  score: EngineScore;
  pv: string[];
  depth: number;
}

export interface AnalyzeOptions {
  /** Fixed search depth. If omitted, `movetime` is used. */
  depth?: number;
  /** Search time in milliseconds (default 500). */
  movetime?: number;
  /** UCI Skill Level 0-20 (default 20 = full strength). */
  skill?: number;
  /** Playing strength in Elo (about 1320-3190). Ignored when the engine build does not support it. */
  elo?: number;
  /** Only consider these moves (UCI, for example "e2e4"). */
  searchMoves?: string[];
}

type LineListener = (line: string) => void;

export class StockfishEngine {
  private worker: Worker | null = null;
  private listeners = new Set<LineListener>();
  private chain: Promise<unknown> = Promise.resolve();
  private initPromise: Promise<void> | null = null;
  private disposed = false;
  private optionNames = new Set<string>();

  init(): Promise<void> {
    this.initPromise ??= new Promise<void>((resolve, reject) => {
      let worker: Worker;
      try {
        worker = new Worker(ENGINE_URL);
      } catch {
        reject(new Error("This browser cannot start the chess engine."));
        return;
      }
      this.worker = worker;

      const timeout = setTimeout(() => reject(new Error("The chess engine took too long to start.")), 20000);
      worker.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Could not load the Stockfish engine files."));
      };
      worker.onmessage = (event: MessageEvent<unknown>) => {
        const line = typeof event.data === "string" ? event.data : "";
        if (line.startsWith("option name ")) {
          const name = line.slice("option name ".length).split(" type ")[0];
          if (name) this.optionNames.add(name.trim());
        }
        for (const listener of this.listeners) listener(line);
      };

      const uciOk = this.waitFor((line) => line === "uciok");
      this.send("uci");
      uciOk
        .then(() => {
          const readyOk = this.waitFor((line) => line === "readyok");
          this.send("isready");
          return readyOk;
        })
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch(reject);
    });
    return this.initPromise;
  }

  /** True when this engine build can limit its own strength by Elo. Known after init(). */
  supportsElo(): boolean {
    return this.optionNames.has("UCI_LimitStrength") && this.optionNames.has("UCI_Elo");
  }

  /** Runs one search. Searches are queued so they never overlap. */
  analyze(fen: string, options: AnalyzeOptions = {}): Promise<EngineResult> {
    const run = async (): Promise<EngineResult> => {
      await this.init();
      if (this.disposed) throw new Error("Engine stopped");

      const skill = Math.min(20, Math.max(0, Math.round(options.skill ?? 20)));
      const whiteToMove = fen.split(" ")[1] !== "b";
      let depth = 0;
      let score: EngineScore = { cp: 0, mate: null };
      let pv: string[] = [];

      const finished = new Promise<string>((resolve) => {
        const listener: LineListener = (line) => {
          if (line.startsWith("info") && line.includes(" score ")) {
            const multipv = /\smultipv (\d+)/.exec(line);
            if (multipv && multipv[1] !== "1") return;
            const depthMatch = /\sdepth (\d+)/.exec(line);
            const scoreMatch = /\sscore (cp|mate) (-?\d+)/.exec(line);
            const pvMatch = /\spv (.+)$/.exec(line);
            if (depthMatch?.[1]) depth = Number(depthMatch[1]);
            if (scoreMatch?.[1] && scoreMatch[2]) {
              const value = Number(scoreMatch[2]) * (whiteToMove ? 1 : -1);
              score = scoreMatch[1] === "cp" ? { cp: value, mate: null } : { cp: null, mate: value };
            }
            if (pvMatch?.[1]) pv = pvMatch[1].split(" ");
          } else if (line.startsWith("bestmove")) {
            this.listeners.delete(listener);
            resolve(line);
          }
        };
        this.listeners.add(listener);
      });

      // Always send every strength setting, so an earlier search (like a hint at full strength) never leaks into this one.
      this.send(`setoption name Skill Level value ${skill}`);
      if (this.supportsElo()) {
        const limited = typeof options.elo === "number";
        this.send(`setoption name UCI_LimitStrength value ${limited ? "true" : "false"}`);
        if (limited) this.send(`setoption name UCI_Elo value ${Math.min(3190, Math.max(1320, Math.round(options.elo ?? 1320)))}`);
      }
      this.send(`position fen ${fen}`);
      const restrict = options.searchMoves?.length ? ` searchmoves ${options.searchMoves.join(" ")}` : "";
      this.send((options.depth ? `go depth ${Math.round(options.depth)}` : `go movetime ${Math.round(options.movetime ?? 500)}`) + restrict);

      const line = await finished;
      const bestMove = line.split(" ")[1] ?? "";
      if (!bestMove || bestMove === "(none)") throw new Error("No legal moves in this position.");
      return { bestMove, score, pv, depth };
    };

    const result = this.chain.then(run, run);
    this.chain = result.catch(() => undefined);
    return result;
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.worker?.terminate();
    this.worker = null;
  }

  private send(command: string): void {
    this.worker?.postMessage(command);
  }

  private waitFor(predicate: (line: string) => boolean): Promise<string> {
    return new Promise((resolve) => {
      const listener: LineListener = (line) => {
        if (predicate(line)) {
          this.listeners.delete(listener);
          resolve(line);
        }
      };
      this.listeners.add(listener);
    });
  }
}
