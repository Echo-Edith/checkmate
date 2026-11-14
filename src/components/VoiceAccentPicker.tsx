"use client";

import { useEffect, useState } from "react";
import { ACCENTS, type AccentId } from "@/lib/accents";
import { readAccent, speak, writeAccent } from "@/lib/speech";

const SAMPLES: Record<string, string> = {
  en: "Hello! Ready to play some chess? Let's find a strong move.",
  es: "¡Hola! ¿Listo para jugar al ajedrez? Busquemos una buena jugada.",
  fr: "Bonjour ! Prêt à jouer aux échecs ? Cherchons un bon coup.",
  de: "Hallo! Bereit für eine Partie Schach? Suchen wir einen starken Zug.",
  pt: "Olá! Pronto para jogar xadrez? Vamos encontrar um bom lance.",
  ja: "こんにちは！チェスをしましょう。良い手を見つけましょう。",
  zh: "你好！准备好下国际象棋了吗？我们来找一步好棋。",
};

/** Lets the player pick how the tutor voice sounds. The language is still the one chosen for the site. */
export function VoiceAccentPicker() {
  const [accent, setAccent] = useState<AccentId>("default");

  useEffect(() => {
    setAccent(readAccent());
  }, []);

  function choose(id: AccentId) {
    setAccent(id);
    writeAccent(id);
    preview();
  }

  function preview() {
    const lang = /(?:^|; )lang=([a-z]{2})/.exec(document.cookie)?.[1] ?? "en";
    speak(SAMPLES[lang] ?? SAMPLES.en ?? "", undefined, "coach");
  }

  return (
    <section className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <h2 className="text-base font-semibold">Voice accent</h2>
      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
        Choose how the tutor voice sounds. It still speaks your chosen language. Turn the voice on in a game to hear it.
      </p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Voice accent">
        {ACCENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={accent === item.id}
            onClick={() => choose(item.id)}
            className="rounded-md border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", fontWeight: accent === item.id ? 700 : 400, background: accent === item.id ? "var(--background)" : "transparent" }}
          >
            {item.label}
          </button>
        ))}
        <button type="button" onClick={preview} className="rounded-md border px-3 py-1.5 text-sm underline" style={{ borderColor: "var(--border)" }}>
          Preview
        </button>
      </div>
    </section>
  );
}
