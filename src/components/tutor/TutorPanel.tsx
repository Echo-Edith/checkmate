"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { loadPreferences } from "@/lib/preferences";
import type { EngineFacts } from "@/lib/engine/facts";
import { askTutor, TutorClientError } from "@/lib/tutor/client";
import { PERSONAS, type Persona } from "@/lib/tutor/schema";

const PERSONA_INFO: Record<Persona, { label: string; blurb: string }> = {
  teacher: { label: "Teacher", blurb: "Patient, simple explanations" },
  coach: { label: "Coach", blurb: "Hints that make you think" },
  analyst: { label: "Analyst", blurb: "Honest review of your play" },
};

interface TutorPanelProps {
  fen: string;
  loggedIn: boolean;
  /** Runs Stockfish and returns facts the tutor may rely on. Null if the engine is unavailable. */
  getEngineFacts?: () => Promise<EngineFacts | null>;
}

export function TutorPanel({ fen, loggedIn, getEngineFacts }: TutorPanelProps) {
  const [persona, setPersona] = useState<Persona>("teacher");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Start with the tutor the user picked in their profile.
  useEffect(() => {
    const saved = loadPreferences()?.tutorPersonality;
    if (saved && PERSONAS.includes(saved)) setPersona(saved);
  }, []);

  async function run(task: "explain" | "ask") {
    setLoading(true);
    setError(null);
    try {
      const facts = (await getEngineFacts?.()) ?? undefined;
      const engine = facts
        ? { evalText: facts.evalText, bestMoveSan: facts.bestMoveSan, line: facts.line, depth: facts.depth }
        : undefined;

      const answer =
        task === "explain"
          ? await askTutor({ kind: "explain_position", persona, fen, engine })
          : await askTutor({ kind: "question", persona, message: message.trim(), fen, engine });
      setReply(answer);
      if (task === "ask") setMessage("");
    } catch (err) {
      setError(err instanceof TutorClientError ? err.message : "The tutor could not answer right now.");
    } finally {
      setLoading(false);
    }
  }

  function onAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim()) void run("ask");
  }

  if (!loggedIn) {
    return (
      <section className="rounded-lg border p-4 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h2 className="font-semibold">AI tutor</h2>
        <p className="mt-1" style={{ color: "var(--muted)" }}>
          <Link href="/login" className="underline">
            Log in
          </Link>{" "}
          to ask the tutor about your game.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border p-4 text-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <h2 className="font-semibold">AI tutor</h2>

      <div className="flex gap-1" role="tablist" aria-label="Tutor personality">
        {PERSONAS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={persona === key}
            title={PERSONA_INFO[key].blurb}
            onClick={() => setPersona(key)}
            className="flex-1 rounded-md border px-2 py-1 text-xs font-medium"
            style={{
              borderColor: "var(--border)",
              background: persona === key ? "var(--accent)" : "transparent",
              color: persona === key ? "#fff" : "inherit",
            }}
          >
            {PERSONA_INFO[key].label}
          </button>
        ))}
      </div>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {PERSONA_INFO[persona].blurb}
      </p>

      <button
        type="button"
        disabled={loading}
        onClick={() => void run("explain")}
        className="w-full rounded-md border px-3 py-1.5 font-medium disabled:opacity-50"
        style={{ borderColor: "var(--border)" }}
      >
        Explain this position
      </button>

      <form onSubmit={onAsk} className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          placeholder="Ask a question…"
          className="min-w-0 flex-1 rounded-md border bg-transparent px-2 py-1.5"
          style={{ borderColor: "var(--border)" }}
          aria-label="Question for the tutor"
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="rounded-md px-3 py-1.5 font-medium text-white disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          Ask
        </button>
      </form>

      {loading && (
        <p role="status" style={{ color: "var(--muted)" }}>
          Thinking…
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-500">
          {error}
        </p>
      )}
      {reply && !loading && <p className="whitespace-pre-wrap leading-relaxed">{reply}</p>}
    </section>
  );
}
