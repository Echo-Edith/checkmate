import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/badges";
import { I18nProvider } from "@/lib/i18n/client";
import { getLang } from "@/lib/i18n/server";
import { isMaintenanceOn, isTester } from "@/lib/db/settings";
import { PreferenceBoot } from "@/components/PreferenceBoot";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Checkm8 — Learn chess with an AI tutor",
  description: "An AI-powered chess learning platform: lessons, puzzles, game analysis and a tutor.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before first paint so the saved theme never flashes the wrong colours.
const THEME_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("checkm8:prefs")||"null");if(p){var r=document.documentElement;if(p.theme&&p.theme!=="system")r.dataset.theme=p.theme;if(p.boardTheme)r.dataset.board=p.boardTheme}}catch(e){}`;

const OPEN_DURING_MAINTENANCE = ["/login", "/register", "/forgot-password", "/reset-password", "/auth"];

/** True when maintenance mode is on and this visitor is neither a Tester nor the owner. */
async function blockedByMaintenance(): Promise<boolean> {
  try {
    if (!(await isMaintenanceOn())) return false;
    const path = (await headers()).get("x-pathname") ?? "/";
    if (OPEN_DURING_MAINTENANCE.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return false;
    const user = await getCurrentUser();
    if (user && (isOwnerEmail(user.email) || (await isTester(user.id)))) return false;
    return true;
  } catch {
    // If the check fails, keep the site open instead of locking everyone out.
    return false;
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  if (await blockedByMaintenance()) {
    return (
      <html lang={lang} suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        </head>
        <body className="min-h-screen antialiased">
          <PreferenceBoot />
          <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Back soon</h1>
            <p className="mt-3" style={{ color: "var(--muted)" }}>
              Checkm8 is being updated. Only Testers can use it right now.
            </p>
            <Link href="/login" className="btn-primary mt-6 rounded-lg px-6 py-2.5 text-sm font-semibold">
              Tester log in
            </Link>
          </main>
        </body>
      </html>
    );
  }
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <I18nProvider lang={lang}>
          <PreferenceBoot />
          <SiteNav />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
