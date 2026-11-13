import { DISCORD_URL } from "@/lib/links";
import { getT } from "@/lib/i18n/server";

/** Opens the Discord invite in a new tab. */
export async function DiscordButton({ className = "card rounded-lg px-6 py-3 text-sm font-semibold" }: { className?: string }) {
  const t = await getT();
  return (
    <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center justify-center ${className}`}>
      {t("discord.join")}
    </a>
  );
}
