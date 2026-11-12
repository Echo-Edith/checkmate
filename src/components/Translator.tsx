"use client";

import { useEffect } from "react";
import { cached, fetchTranslations, fill, isFailed, loadCache, prepare } from "@/lib/translate-client";
import type { Lang } from "@/lib/i18n/messages";

const SKIP = "[translate=no], script, style, textarea, input, select option:checked, code, pre, [contenteditable=true], noscript";
const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;

interface Target {
  /** Reads the current text. */
  get: () => string;
  /** Writes the translated text. */
  set: (value: string) => void;
  node: Node;
}

/**
 * Translates every visible text on the page into the chosen language, so nothing stays in English.
 * The built-in dictionary covers the main texts. This fills in the rest with saved AI translations.
 * Anything inside translate="no" (usernames, chat, tutor answers) is left alone.
 */
export function Translator({ lang }: { lang: Lang }) {
  useEffect(() => {
    if (lang === "en") return;
    loadCache(lang);
    /** What we wrote into each node, so we never translate our own output again. */
    const written = new WeakMap<object, string>();
    let timer: number | undefined;
    let stopped = false;

    function collect(): Target[] {
      const targets: Target[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const textNode = node as Text;
        const parent = textNode.parentElement;
        if (!parent || parent.closest(SKIP)) continue;
        targets.push({
          node: textNode,
          get: () => textNode.nodeValue ?? "",
          set: (value) => {
            textNode.nodeValue = value;
          },
        });
      }
      document.body.querySelectorAll<HTMLElement>("[placeholder],[aria-label],[title],[alt]").forEach((element) => {
        if (element.closest("[translate=no], script, style")) return;
        for (const name of ATTRS) {
          if (!element.hasAttribute(name)) continue;
          targets.push({
            node: element,
            get: () => element.getAttribute(name) ?? "",
            set: (value) => element.setAttribute(name, value),
          });
        }
      });
      return targets;
    }

    async function run() {
      if (stopped) return;
      const pending: Array<{ target: Target; core: string; lead: string; tail: string; numbers: string[]; original: string }> = [];
      for (const target of collect()) {
        const current = target.get();
        if (written.get(target.node) === current && target.node.nodeType === Node.TEXT_NODE) continue;
        const info = prepare(current, lang);
        if (!info) continue;
        const hit = cached(lang, info.core);
        if (hit !== undefined) {
          const value = `${info.lead}${fill(hit, info.numbers)}${info.tail}`;
          if (value !== current) {
            target.set(value);
            if (target.node.nodeType === Node.TEXT_NODE) written.set(target.node, value);
          }
        } else if (!isFailed(lang, info.core)) {
          pending.push({ target, core: info.core, lead: info.lead, tail: info.tail, numbers: info.numbers, original: current });
        }
      }
      if (pending.length === 0) return;
      await fetchTranslations(lang, pending.map((item) => item.core));
      if (stopped) return;
      for (const item of pending) {
        const hit = cached(lang, item.core);
        // Only write if React has not changed the text meanwhile.
        if (hit === undefined || item.target.get() !== item.original) continue;
        const value = `${item.lead}${fill(hit, item.numbers)}${item.tail}`;
        item.target.set(value);
        if (item.target.node.nodeType === Node.TEXT_NODE) written.set(item.target.node, value);
      }
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void run(), 120);
    }

    // Wait a moment so React has finished hydrating before the page text is changed.
    const start = window.setTimeout(() => {
      void run();
      observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    }, 200);
    const observer = new MutationObserver(schedule);

    return () => {
      stopped = true;
      window.clearTimeout(start);
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [lang]);

  return null;
}
