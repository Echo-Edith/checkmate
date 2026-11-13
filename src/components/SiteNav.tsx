import Image from "next/image";
import Link from "next/link";
import { AchievementToaster } from "@/components/AchievementToaster";
import { FriendsNavLink } from "@/components/friends/FriendsNavLink";
import { SoundToggle } from "@/components/SoundToggle";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { DISCORD_URL } from "@/lib/links";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import { isOwnerEmail } from "@/lib/badges";

const LINKS: Array<{ href: string; key: MessageKey }> = [
  { href: "/play", key: "nav.play" },
  { href: "/puzzles", key: "nav.puzzles" },
  { href: "/lessons", key: "nav.lessons" },
  { href: "/online", key: "nav.online" },
  { href: "/analyze", key: "nav.analyse" },
  { href: "/players", key: "nav.players" },
];

export async function SiteNav() {
  const user = await getCurrentUser();
  const t = await getT();

  return (
    <>
    <header className="nav-glass sticky top-0 z-30 border-b" style={{ borderColor: "var(--border)" }}>
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-sm sm:px-6 sm:py-3" aria-label="Main">
        <Link href="/" className="mr-3 flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, var(--glow)))" }}>
            <Image src="/logo.png" alt="" width={22} height={22} priority className="h-[22px] w-[22px]" />
          </span>
          Checkm8
        </Link>
        {/* On phones the links take their own row and scroll sideways, so none of them ever disappear. */}
        <div className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:order-none sm:mx-0 sm:w-auto sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
          {(user && isOwnerEmail(user.email) ? [...LINKS, { href: "/admin", key: "nav.owner" as MessageKey }] : LINKS).map((link) => (
            <Link key={link.href} href={link.href} style={{ color: "var(--muted)" }} className="shrink-0 rounded-full px-3 py-1.5 hover:opacity-80 sm:px-0 sm:py-0">
              {t(link.key)}
            </Link>
          ))}
          {user && <FriendsNavLink />}
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }} className="shrink-0 rounded-full px-3 py-1.5 font-medium hover:opacity-80 sm:px-0 sm:py-0" translate="no">
            Discord
          </a>
        </div>
        <span className="ml-auto flex items-center gap-3 sm:gap-4">
          <LanguageSwitcher />
          <SoundToggle />
          <ThemeSwitcher loggedIn={Boolean(user)} />
          {user ? (
            <>
              <Link href="/profile" style={{ color: "var(--muted)" }}>
                {t("nav.profile")}
              </Link>
              <form action="/auth/logout" method="post">
                <button type="submit" className="rounded-md border px-3 py-1" style={{ borderColor: "var(--border)" }}>
                  {t("nav.logout")}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" style={{ color: "var(--muted)" }}>
                {t("nav.login")}
              </Link>
              <Link href="/register" className="btn-primary rounded-md px-3 py-1 font-medium">
                {t("nav.signup")}
              </Link>
            </>
          )}
        </span>
      </nav>
    </header>
    {user && <AchievementToaster />}
    </>
  );
}
