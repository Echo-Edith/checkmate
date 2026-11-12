"use client";

import { MESSAGES, type Lang } from "@/lib/i18n/messages";

/** Browser side of the page translator: cache, batching and the API call. */

const MAX_CACHE = 4000;
const memory = new Map<string, string>();
const loadedFor = new Set<string>();
const failed = new Set<string>();
const inflight = new Set<string>();
let saveTimer: number | undefined;

function storageKey(lang: Lang): string {
  return `checkm8:tr:${lang}`;
}

export function loadCache(lang: Lang): void {
  if (loadedFor.has(lang)) return;
  loadedFor.add(lang);
  try {
    const raw = localStorage.getItem(storageKey(lang));
    if (raw) for (const [key, value] of Object.entries(JSON.parse(raw) as Record<string, string>)) memory.set(`${lang}|${key}`, value);
  } catch {
    // Storage blocked or damaged: translating still works, it is just not remembered.
  }
}

function saveSoon(lang: Lang): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const entries: Record<string, string> = {};
      let count = 0;
      for (const [key, value] of memory) {
        if (!key.startsWith(`${lang}|`)) continue;
        if (count++ >= MAX_CACHE) break;
        entries[key.slice(lang.length + 1)] = value;
      }
      localStorage.setItem(storageKey(lang), JSON.stringify(entries));
    } catch {
      // Ignore: the cache is only a speed-up.
    }
  }, 1000);
}

/** Texts that the built-in dictionary already provides in this language. */
const known = new Map<string, Set<string>>();
function knownTexts(lang: Lang): Set<string> {
  let set = known.get(lang);
  if (!set) {
    set = new Set(Object.values(MESSAGES[lang]));
    known.set(lang, set);
  }
  return set;
}

const SAN = /^(?:[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O(?:-O)?[+#]?|\d+\.{1,3})$/;

/** Splits a text into the part to translate and its surrounding spaces. Numbers become {1}, {2}, ... */
export function prepare(text: string, lang: Lang): { lead: string; core: string; tail: string; numbers: string[] } | null {
  const match = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  if (!match) return null;
  const [, lead = "", body = "", tail = ""] = match;
  if (body.length < 2 || body.length > 800) return null;
  if (!/\p{L}/u.test(body)) return null;
  if (SAN.test(body) || /^https?:\/\//.test(body) || body.includes("@")) return null;
  if (knownTexts(lang).has(body)) return null;
  if ((lang === "ja" || lang === "zh") && /[\u3040-\u30ff\u4e00-\u9fff]/.test(body)) return null;
  const numbers: string[] = [];
  const core = body.replace(/\d+(?:[.,]\d+)?/g, (number) => {
    numbers.push(number);
    return `{${numbers.length}}`;
  });
  return { lead, core, tail, numbers };
}

export function fill(translated: string, numbers: string[]): string {
  return translated.replace(/\{(\d+)\}/g, (whole, index: string) => numbers[Number(index) - 1] ?? whole);
}

export function cached(lang: Lang, core: string): string | undefined {
  return memory.get(`${lang}|${core}`);
}

export function isFailed(lang: Lang, core: string): boolean {
  return failed.has(`${lang}|${core}`);
}

/** Translates the given texts (not yet cached) and returns when they are stored. */
export async function fetchTranslations(lang: Lang, cores: string[]): Promise<void> {
  const todo = [...new Set(cores)].filter((core) => !memory.has(`${lang}|${core}`) && !inflight.has(`${lang}|${core}`) && !failed.has(`${lang}|${core}`));
  for (const core of todo) inflight.add(`${lang}|${core}`);
  const batches: string[][] = [];
  let current: string[] = [];
  let size = 0;
  for (const core of todo) {
    if (current.length >= 30 || size + core.length > 5000) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(core);
    size += core.length;
  }
  if (current.length > 0) batches.push(current);

  await Promise.all(
    batches.map(async (batch) => {
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lang, texts: batch }),
        });
        const data = (await response.json().catch(() => ({}))) as { translations?: Record<string, string> };
        for (const core of batch) {
          const value = data.translations?.[core];
          if (value) memory.set(`${lang}|${core}`, value);
          else if (!response.ok) failed.add(`${lang}|${core}`);
        }
        if (!response.ok) window.setTimeout(() => batch.forEach((core) => failed.delete(`${lang}|${core}`)), 20000);
      } catch {
        for (const core of batch) failed.add(`${lang}|${core}`);
        window.setTimeout(() => batch.forEach((core) => failed.delete(`${lang}|${core}`)), 20000);
      } finally {
        for (const core of batch) inflight.delete(`${lang}|${core}`);
      }
    }),
  );
  saveSoon(lang);
}

/** Translates one text for reading aloud. Returns the original text if translating fails. */
export async function translateForSpeech(lang: Lang, text: string): Promise<string> {
  if (lang === "en") return text;
  loadCache(lang);
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const prepared = parts.map((part) => ({ part, info: prepare(part, lang) }));
  await fetchTranslations(lang, prepared.flatMap((item) => (item.info ? [item.info.core] : [])));
  return prepared
    .map(({ part, info }) => {
      if (!info) return part;
      const hit = cached(lang, info.core);
      return hit ? fill(hit, info.numbers) : part;
    })
    .join(" ");
}
