"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { StockfishEngine } from "@/lib/engine/stockfish";

export type EngineStatus = "idle" | "loading" | "ready" | "error";

/**
 * Starts the engine lazily (only when `enabled`) and disposes it on unmount.
 * The engine is created in an effect, so it is never touched during server rendering.
 */
export function useStockfish(enabled: boolean): {
  status: EngineStatus;
  error: string | null;
  engine: RefObject<StockfishEngine | null>;
} {
  const engineRef = useRef<StockfishEngine | null>(null);
  const [status, setStatus] = useState<EngineStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const engine = new StockfishEngine();
    engineRef.current = engine;
    setStatus("loading");
    setError(null);

    engine
      .init()
      .then(() => {
        if (active) setStatus("ready");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "The chess engine failed to start.");
      });

    return () => {
      active = false;
      engine.dispose();
      engineRef.current = null;
    };
  }, [enabled]);

  return { status, error, engine: engineRef };
}
