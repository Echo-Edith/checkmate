"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "@/lib/db/chat";
import { playSound } from "@/lib/sounds";

/** Live chat for a game ("game") or between friends ("dm"). It checks for new messages every 2 seconds. */
export function ChatBox({ scope, target, height = "h-56" }: { scope: "game" | "dm"; target: string; height?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const lastId = useRef<string | undefined>(undefined);
  const loaded = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  const merge = useCallback((incoming: ChatMessage[], fromPoll: boolean) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const seen = new Set(current.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) return current;
      if (fromPoll && loaded.current && fresh.some((m) => !m.mine)) playSound("message");
      return [...current, ...fresh].slice(-200);
    });
    lastId.current = incoming[incoming.length - 1]?.id ?? lastId.current;
  }, []);

  // Start fresh when the conversation changes.
  useEffect(() => {
    setMessages([]);
    lastId.current = undefined;
    loaded.current = false;
    setError(null);
  }, [scope, target]);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    async function poll() {
      let delay = 2000;
      try {
        if (document.hidden) {
          delay = 6000;
        } else {
          const after = lastId.current ? `&after=${lastId.current}` : "";
          const response = await fetch(`/api/chat?scope=${scope}&target=${target}${after}`, { cache: "no-store" });
          if (response.ok) {
            const data = (await response.json()) as { messages: ChatMessage[] };
            if (!stopped) {
              merge(data.messages, true);
              loaded.current = true;
            }
          } else {
            delay = 6000;
          }
        }
      } catch {
        delay = 6000;
      }
      if (!stopped) timer = window.setTimeout(poll, delay);
    }
    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [scope, target, merge]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, target, text }),
      });
      const data = (await response.json().catch(() => ({}))) as { message?: ChatMessage; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? "Could not send.");
      setDraft("");
      merge([data.message], false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={listRef} className={`${height} space-y-1.5 overflow-y-auto rounded-lg border p-2 text-sm`} style={{ borderColor: "var(--border)" }} aria-live="polite">
        {messages.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No messages yet. Say hi!</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.mine ? "justify-end" : "justify-start"}`}>
              <p
                translate="no"
                className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 leading-snug"
                style={message.mine ? { background: "var(--accent)", color: "var(--accent-fg)" } : { background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {!message.mine && (
                  <span translate="no" className="mb-0.5 block text-[10px] font-semibold opacity-70">{message.name}</span>
                )}
                {message.text}
              </p>
            </div>
          ))
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
      <form onSubmit={send} className="flex gap-1.5">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={500}
          placeholder="Write a message…"
          aria-label="Chat message"
          className="min-w-0 flex-1 rounded-full border bg-transparent px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--border)" }}
        />
        <button type="submit" disabled={sending || !draft.trim()} className="btn-primary rounded-full px-4 text-sm font-medium disabled:opacity-40">
          Send
        </button>
      </form>
    </div>
  );
}
