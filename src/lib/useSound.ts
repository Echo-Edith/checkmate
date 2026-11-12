"use client";

import { useCallback, useEffect, useState } from "react";
import { onSoundSettingChange, playSound, readSoundSetting, writeSoundSetting, type SoundKind } from "@/lib/sounds";

/** Shared sound switch. Sound is on until the player turns it off. */
export function useSound() {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    setEnabledState(readSoundSetting());
    return onSoundSettingChange(() => setEnabledState(readSoundSetting()));
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    writeSoundSetting(on);
    // Turning it on from a tap also unlocks audio in the browser. Play a small confirmation.
    if (on) playSound("move");
  }, []);

  const play = useCallback((kind: SoundKind) => playSound(kind), []);
  return { enabled, setEnabled, play };
}
