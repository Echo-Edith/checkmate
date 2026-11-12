"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { DEFAULT_LANG, translate, type Lang, type MessageKey } from "@/lib/i18n/messages";

const LangContext = createContext<Lang>(DEFAULT_LANG);

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

/** For client components: `const t = useT(); t("game.flip")`. */
export function useT() {
  const lang = useContext(LangContext);
  return useCallback((key: MessageKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}
