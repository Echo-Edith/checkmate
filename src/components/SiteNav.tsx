import Image from "next/image";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getCurrentUser } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/badges";

const LINKS = [
  { href: "/play", label: "Play" },
  { href: "/puzzles", label: "Puzzles" },
  { href: "/lessons", label: "Lessons" },
  { href: "/analyze", label: "Analyse" },
  { href: "/players", label: "Players" },
];

export async function SiteNav() {
  const user = await getCurrentUser();

  return (
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
          {(user && isOwnerEmail(user.email) ? [...LINKS, { href: "/admin", label: "Owner panel" }] : LINKS).map((link) => (
            <Link key={link.href} href={link.href} style={{ color: "var(--muted)" }} className="shrink-0 rounded-full px-3 py-1.5 hover:opacity-80 sm:px-0 sm:py-0">
              {link.label}
            </Link>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-3 sm:gap-4">
          <ThemeSwitcher loggedIn={Boolean(user)} />
          {user ? (
            <>
              <Link href="/profile" style={{ color: "var(--muted)" }}>
                Profile
              </Link>
              <form action="/auth/logout" method="post">
                <button type="submit" className="rounded-md border px-3 py-1" style={{ borderColor: "var(--border)" }}>
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" style={{ color: "var(--muted)" }}>
                Log in
              </Link>
              <Link href="/register" className="btn-primary rounded-md px-3 py-1 font-medium">
                Sign up
              </Link>
            </>
          )}
        </span>
      </nav>
    </header>
  );
}
