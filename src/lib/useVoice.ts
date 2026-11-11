"use client";

import { useCallback, useEffect, useState } from "react";
import { onVoiceSettingChange, readVoiceSetting, speak, speechSupported, stopSpeaking, writeVoiceSetting } from "@/lib/speech";

/** Shared "read aloud" switch. The choice is remembered and stays in sync across components. */
export function useVoice() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabledState] = useState(false);

  useEffect(() => {
    setSupported(speechSupported());
    setEnabledState(readVoiceSetting());
    return onVoiceSettingChange(() => setEnabledState(readVoiceSetting()));
  }, []);

  const setEnabled = useCallback((on: boolean) => {
    if (!on) stopSpeaking();
    writeVoiceSetting(on);
  }, []);

  /** Speaks only when the voice switch is on. */
  const say = useCallback(
    (text: string) => {
      if (enabled) speak(text);
    },
    [enabled],
  );

  return { supported, enabled, setEnabled, say };
}
