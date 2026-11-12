import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, isLang, translate, type Lang, type MessageKey } from "@/lib/i18n/messages";

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

/** For server components: `const t = await getT(); t("nav.play")`. */
export async function getT() {
  const lang = await getLang();
  return (key: MessageKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
}
