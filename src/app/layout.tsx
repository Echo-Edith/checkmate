import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
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
};

// Runs before first paint so the saved theme never flashes the wrong colours.
const THEME_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("checkm8:prefs")||"null");if(p){var r=document.documentElement;if(p.theme&&p.theme!=="system")r.dataset.theme=p.theme;if(p.boardTheme)r.dataset.board=p.boardTheme}}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <PreferenceBoot />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
