import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const LINKS = [
  { href: "/play", label: "Play" },
  { href: "/puzzles", label: "Puzzles" },
  { href: "/lessons", label: "Lessons" },
  { href: "/analyze", label: "Analyse" },
];

export async function SiteNav() {
  const user = await getCurrentUser();

  return (
    <header className="border-b" style={{ borderColor: "var(--border)" }}>
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm sm:px-6" aria-label="Main">
        <Link href="/" className="mr-2 text-base font-semibold tracking-tight">
          Checkm8
        </Link>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} style={{ color: "var(--muted)" }} className="hover:opacity-80">
            {link.label}
          </Link>
        ))}
        <span className="ml-auto flex items-center gap-4">
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
              <Link href="/register" className="rounded-md px-3 py-1 font-medium text-white" style={{ background: "var(--accent)" }}>
                Sign up
              </Link>
            </>
          )}
        </span>
      </nav>
    </header>
  );
}
