"use client";

import { useRouter } from "next/navigation";
import { useLang, useT } from "@/lib/i18n/client";
import { LANGS, LANG_COOKIE, type Lang } from "@/lib/i18n/messages";

export function LanguageSwitcher() {
  const lang = useLang();
  const t = useT();
  const router = useRouter();

  function change(next: Lang) {
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    router.refresh();
  }

  return (
    <select
      value={lang}
      onChange={(event) => change(event.target.value as Lang)}
      aria-label={t("lang.label")}
      title={t("lang.label")}
      className="rounded-md border bg-transparent px-1.5 py-1 text-sm"
      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
    >
      {LANGS.map((item) => (
        <option key={item.id} value={item.id} style={{ color: "#111" }}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
