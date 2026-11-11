import Image from "next/image";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getCurrentUser } from "@/lib/auth";

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
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm sm:px-6" aria-label="Main">
        <Link href="/" className="mr-3 flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, var(--glow)))" }}>
            <Image src="/logo.png" alt="" width={22} height={22} priority className="h-[22px] w-[22px]" />
          </span>
          Checkm8
        </Link>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} style={{ color: "var(--muted)" }} className="hover:opacity-80">
            {link.label}
          </Link>
        ))}
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
