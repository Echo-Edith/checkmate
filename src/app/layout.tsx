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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <PreferenceBoot />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
