"use client";

import { useEffect, useState } from "react";
import { isPieceSet } from "@/components/chess/pieces";
import { loadPreferences } from "@/lib/preferences";
import type { PieceSetId } from "@/lib/themes";

/** The piece design this player chose. Updates at once when they change it. */
export function usePieceSet(): PieceSetId {
  const [set, setSet] = useState<PieceSetId>("classic");
  useEffect(() => {
    const read = () => {
      const value = loadPreferences()?.pieceSet;
      setSet(isPieceSet(value) ? value : "classic");
    };
    read();
    window.addEventListener("checkm8:prefs-changed", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("checkm8:prefs-changed", read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return set;
}
