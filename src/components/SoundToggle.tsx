"use client";

import { SpeakerIcon } from "@/components/SpeakButton";
import { useSound } from "@/lib/useSound";

/** Nav button that turns game sounds on or off. */
export function SoundToggle() {
  const sound = useSound();
  return (
    <button
      type="button"
      onClick={() => sound.setEnabled(!sound.enabled)}
      aria-pressed={sound.enabled}
      aria-label={sound.enabled ? "Turn game sounds off" : "Turn game sounds on"}
      title={sound.enabled ? "Sounds on" : "Sounds off"}
      className="grid h-8 w-8 place-items-center rounded-full border"
      style={{ borderColor: "var(--border)", color: sound.enabled ? "var(--accent)" : "var(--muted)" }}
    >
      <SpeakerIcon off={!sound.enabled} />
    </button>
  );
}
