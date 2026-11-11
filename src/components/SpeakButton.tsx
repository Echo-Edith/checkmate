"use client";

import { useEffect, useState } from "react";
import { speak, speechSupported, stopSpeaking } from "@/lib/speech";

/** "Listen" button: reads the given text aloud, tap again to stop. Hidden if the browser cannot speak. */
export function SpeakButton({ text, label = "Listen", className = "" }: { text: string; label?: string; className?: string }) {
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setSupported(speechSupported());
    return () => stopSpeaking();
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (playing) {
          stopSpeaking();
          setPlaying(false);
        } else {
          setPlaying(true);
          speak(text, () => setPlaying(false));
        }
      }}
      aria-pressed={playing}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${className}`}
      style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
    >
      <SpeakerIcon />
      {playing ? "Stop" : label}
    </button>
  );
}

export function SpeakerIcon({ off = false }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {off ? <path d="m16 9 5 6m0-6-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
    </svg>
  );
}
