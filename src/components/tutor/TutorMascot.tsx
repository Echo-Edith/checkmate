"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { EngineFacts } from "@/lib/engine/facts";
import { loadPreferences } from "@/lib/preferences";
import { askTutor, TutorClientError } from "@/lib/tutor/client";
import { PERSONAS, type Persona } from "@/lib/tutor/schema";

const MASCOT_SIZE = 64;
const EDGE = 8;
const STORAGE_KEY = "checkm8:mascot";
const DRAG_THRESHOLD = 6;
const MAX_MESSAGES = 30;

const PERSONA_INFO: Record<Persona, { label: string; greeting: string }> = {
  teacher: { label: "Teacher", greeting: "Hi! I am your teacher. Tap a button and I will explain in simple words." },
  coach: { label: "Coach", greeting: "Hey, coach here. Tap a button and I will give you a push in the right direction." },
  analyst: { label: "Analyst", greeting: "Analyst here. Tap a button and I will check the facts with the engine." },
};

interface Chat {
  id: number;
  role: "tutor" | "user";
  text: string;
}

interface Point {
  x: number;
  y: number;
}

interface TutorMascotProps {
  fen: string;
  lastMoveSan: string | null;
  loggedIn: boolean;
  /** Runs Stockfish and returns facts the tutor may rely on. Null if the engine is unavailable. */
  getEngineFacts?: () => Promise<EngineFacts | null>;
}

function clampPoint(point: Point): Point {
  if (typeof window === "undefined") return point;
  return {
    x: Math.min(Math.max(EDGE, point.x), window.innerWidth - MASCOT_SIZE - EDGE),
    y: Math.min(Math.max(EDGE, point.y), window.innerHeight - MASCOT_SIZE - EDGE),
  };
}

function Face({ persona }: { persona: Persona }) {
  return (
    <svg viewBox="0 0 64 64" width={MASCOT_SIZE} height={MASCOT_SIZE} aria-hidden>
      <ellipse cx="32" cy="60" rx="18" ry="3" fill="rgba(0,0,0,0.22)" />
      <g className="mascot-body">
        <path d="M17 55 Q18 41 27 37 H37 Q46 41 47 55 Z" fill="var(--accent)" />
        <rect x="13" y="52" width="38" height="7" rx="3.5" fill="var(--accent)" />
        <rect x="13" y="52" width="38" height="7" rx="3.5" fill="rgba(0,0,0,0.18)" />
        <circle cx="32" cy="24" r="16" fill="var(--accent)" />
        <circle cx="32" cy="25" r="12" fill="#ffffff" />
        <g className="mascot-eyes">
          <circle cx="27.5" cy="24" r="2.5" fill="#111827" />
          <circle cx="36.5" cy="24" r="2.5" fill="#111827" />
        </g>
        <path d="M27.5 30 Q32 34 36.5 30" fill="none" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" />
        {persona === "teacher" && (
          <g fill="none" stroke="#111827" strokeWidth="1.6">
            <circle cx="27.5" cy="24" r="4.4" />
            <circle cx="36.5" cy="24" r="4.4" />
            <path d="M31.9 24 H32.1" />
          </g>
        )}
        {persona === "coach" && (
          <g>
            <path d="M16 20 Q32 2 48 20 Z" fill="#111827" />
            <rect x="14" y="19" width="36" height="3.5" rx="1.75" fill="#111827" />
            <circle cx="32" cy="9" r="2" fill="#ffffff" />
          </g>
        )}
        {persona === "analyst" && (
          <g fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round">
            <circle cx="48" cy="40" r="6" fill="rgba(255,255,255,0.55)" />
            <path d="M52.5 44.5 L58 50" />
          </g>
        )}
      </g>
    </svg>
  );
}

export function TutorMascot({ fen, lastMoveSan, loggedIn, getEngineFacts }: TutorMascotProps) {
  const [pos, setPos] = useState<Point | null>(null);
  const [open, setOpen] = useState(false);
  const [persona, setPersona] = useState<Persona>("teacher");
  const [messages, setMessages] = useState<Chat[]>([]);
  const [phase, setPhase] = useState<"idle" | "checking" | "writing">("idle");
  const [unread, setUnread] = useState(false);
  const [draft, setDraft] = useState("");
  const [viewport, setViewport] = useState({ w: 1024, h: 768 });

  const dragRef = useRef<{ pointerId: number; start: Point; origin: Point; moved: boolean } | null>(null);
  const nextId = useRef(1);
  const openRef = useRef(false);
  const factsCache = useRef<{ fen: string; facts: EngineFacts | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fenRef = useRef(fen);
  fenRef.current = fen;
  openRef.current = open;

  const busy = phase !== "idle";

  // Starting position and saved settings (client only, so there is no server/client mismatch).
  useEffect(() => {
    const preferred = loadPreferences()?.tutorPersonality;
    const chosen: Persona = preferred && PERSONAS.includes(preferred) ? preferred : "teacher";
    setPersona(chosen);
    setMessages([{ id: nextId.current++, role: "tutor", text: PERSONA_INFO[chosen].greeting }]);

    let start: Point = { x: window.innerWidth - MASCOT_SIZE - 16, y: window.innerHeight - MASCOT_SIZE - 24 };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Point>;
        if (typeof saved.x === "number" && typeof saved.y === "number") start = { x: saved.x, y: saved.y };
      }
    } catch {
      // Storage can be blocked. The default corner is fine.
    }
    setPos(clampPoint(start));
    setViewport({ w: window.innerWidth, h: window.innerHeight });
  }, []);

  // Keep the mascot on screen when the window changes size.
  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setPos((current) => (current ? clampPoint(current) : current));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Scroll to the newest message.
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages, open, phase]);

  useEffect(() => {
    if (open) setUnread(false);
  }, [open]);

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!pos) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      start: { x: event.clientX, y: event.clientY },
      origin: pos,
      moved: false,
    };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.start.x;
    const dy = event.clientY - drag.start.y;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    setPos(clampPoint({ x: drag.origin.x + dx, y: drag.origin.y + dy }));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (drag.moved) {
      const finalPos = clampPoint({
        x: drag.origin.x + event.clientX - drag.start.x,
        y: drag.origin.y + event.clientY - drag.start.y,
      });
      setPos(finalPos);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPos));
      } catch {
        // Not saving the position is fine.
      }
    } else {
      setOpen((value) => !value);
    }
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    // Keyboard users: Enter/Space opens the chat. Arrow keys move the mascot.
    const step = 24;
    const moves: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const delta = moves[event.key];
    if (delta) {
      event.preventDefault();
      setPos((current) => (current ? clampPoint({ x: current.x + delta.x, y: current.y + delta.y }) : current));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen((value) => !value);
    }
  }

  const addMessage = useCallback((role: Chat["role"], text: string): number => {
    const id = nextId.current++;
    setMessages((list) => [...list, { id, role, text }].slice(-MAX_MESSAGES));
    return id;
  }, []);

  const updateMessage = useCallback((id: number, text: string) => {
    setMessages((list) => list.map((item) => (item.id === id ? { ...item, text } : item)));
  }, []);

  async function ask(label: string, build: (engine: EngineFacts | undefined) => Parameters<typeof askTutor>[0]) {
    if (busy) return;
    addMessage("user", label);
    setPhase("checking");
    const askedFen = fen;
    const replyId = addMessage("tutor", "…");
    try {
      let facts: EngineFacts | null;
      if (factsCache.current?.fen === askedFen) {
        facts = factsCache.current.facts;
      } else {
        facts = (await getEngineFacts?.()) ?? null;
        factsCache.current = { fen: askedFen, facts };
      }
      setPhase("writing");
      const final = await askTutor(build(facts ?? undefined), (text) => updateMessage(replyId, text));
      updateMessage(replyId, final);
      if (!openRef.current) setUnread(true);
      if (fenRef.current !== askedFen) {
        addMessage("tutor", "The board has changed since you asked. Ask me again to look at the new position.");
      }
    } catch (error) {
      updateMessage(replyId, error instanceof TutorClientError ? error.message : "I could not answer right now. Please try again.");
    } finally {
      setPhase("idle");
    }
  }

  function engineOf(facts: EngineFacts | undefined) {
    return facts ? { evalText: facts.evalText, bestMoveSan: facts.bestMoveSan, line: facts.line, depth: facts.depth } : undefined;
  }

  function askQuestion(label: string, message: string) {
    void ask(label, (facts) => ({ kind: "question", persona, message, fen, engine: engineOf(facts) }));
  }

  const chips: Array<{ label: string; run: () => void; disabled?: boolean }> = [
    { label: "Explain this position", run: () => void ask("Explain this position", (facts) => ({ kind: "explain_position", persona, fen, engine: engineOf(facts) })) },
    { label: "What is the best move?", run: () => askQuestion("What is the best move?", "What is the best move here, and why? Keep it short.") },
    { label: "What is my plan?", run: () => askQuestion("What is my plan?", "What is a good plan for the side to move in this position?") },
    { label: "Any danger?", run: () => askQuestion("Any danger?", "Are there any threats or dangers I should watch out for right now?") },
    {
      label: lastMoveSan ? `Was ${lastMoveSan} good?` : "Was that move good?",
      run: () => askQuestion(`Was ${lastMoveSan} good?`, `The last move played was ${lastMoveSan}. What did it do, and was it a good move?`),
      disabled: !lastMoveSan,
    },
  ];

  function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    askQuestion(text, text);
  }

  function changePersona(next: Persona) {
    setPersona(next);
    addMessage("tutor", PERSONA_INFO[next].greeting);
  }

  if (!pos) return null;

  // Panel placement: next to the mascot, always inside the screen.
  const panelWidth = Math.min(340, viewport.w - 16);
  const panelHeight = Math.min(430, viewport.h - 16);
  const mascotCenterX = pos.x + MASCOT_SIZE / 2;
  const panelLeft = Math.min(Math.max(8, mascotCenterX - panelWidth / 2), viewport.w - panelWidth - 8);
  const above = pos.y > viewport.h / 2;
  const panelTop = above
    ? Math.max(8, pos.y - panelHeight - 10)
    : Math.min(viewport.h - panelHeight - 8, pos.y + MASCOT_SIZE + 10);

  return (
    <>
      {open && (
        <section
          aria-label="Chess tutor chat"
          className="mascot-panel fixed z-50 flex flex-col overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            left: panelLeft,
            top: panelTop,
            width: panelWidth,
            height: panelHeight,
            borderColor: "var(--border)",
            background: "var(--background)",
          }}
        >
          <header className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex flex-1 gap-1" role="tablist" aria-label="Tutor style">
              {PERSONAS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={persona === key}
                  onClick={() => changePersona(key)}
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: persona === key ? "var(--accent)" : "transparent",
                    color: persona === key ? "var(--accent-fg)" : "var(--muted)",
                  }}
                >
                  {PERSONA_INFO[key].label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-7 w-7 place-items-center rounded-full text-lg leading-none" style={{ color: "var(--muted)" }}>
              ×
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <p
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed"
                  style={
                    message.role === "user"
                      ? { background: "var(--accent)", color: "var(--accent-fg)", borderBottomRightRadius: 4 }
                      : { background: "var(--surface)", border: "1px solid var(--border)", borderBottomLeftRadius: 4 }
                  }
                >
                  {message.text === "…" ? <Dots /> : message.text}
                </p>
              </div>
            ))}
            {phase === "checking" && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Checking the position with Stockfish…
              </p>
            )}
          </div>

          {loggedIn ? (
            <div className="border-t p-2" style={{ borderColor: "var(--border)" }}>
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    disabled={busy || chip.disabled}
                    onClick={chip.run}
                    className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-40"
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <form onSubmit={onSend} className="flex gap-1.5">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={500}
                  placeholder="Or type your own question…"
                  aria-label="Question for the tutor"
                  className="min-w-0 flex-1 rounded-full border bg-transparent px-3 py-1.5 text-sm"
                  style={{ borderColor: "var(--border)" }}
                />
                <button type="submit" disabled={busy || !draft.trim()} className="btn-primary rounded-full px-3 text-sm font-medium disabled:opacity-40">
                  Send
                </button>
              </form>
            </div>
          ) : (
            <p className="border-t p-3 text-sm" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
              <Link href="/login" className="underline">
                Log in
              </Link>{" "}
              to chat with the tutor. It is free.
            </p>
          )}
        </section>
      )}

      <button
        type="button"
        aria-label={open ? "Close the chess tutor" : "Open the chess tutor. Drag to move it."}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onKeyDown={onKeyDown}
        className="fixed z-50 cursor-grab select-none active:cursor-grabbing"
        style={{ left: pos.x, top: pos.y, width: MASCOT_SIZE, height: MASCOT_SIZE, touchAction: "none", filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.25))" }}
      >
        <Face persona={persona} />
        {unread && !open && <span className="absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2" style={{ background: "#ef4444", borderColor: "var(--background)" }} />}
        {!open && messages.length <= 1 && (
          <span
            aria-hidden
            className="mascot-panel pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium"
            style={{ background: "var(--background)", borderColor: "var(--border)" }}
          >
            Need help? Tap me!
          </span>
        )}
      </button>
    </>
  );
}

function Dots() {
  return (
    <span className="inline-flex gap-1" aria-label="Writing">
      {[0, 1, 2].map((index) => (
        <span key={index} className="mascot-body h-1.5 w-1.5 rounded-full" style={{ background: "var(--muted)", animationDelay: `${index * 0.15}s`, animationDuration: "0.9s" }} />
      ))}
    </span>
  );
}
