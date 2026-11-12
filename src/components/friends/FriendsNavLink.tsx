"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { playSound } from "@/lib/sounds";

/** "Friends" link with a red number for new friend requests and challenges. Plays a ding when something new arrives. */
export function FriendsNavLink() {
  const [count, setCount] = useState(0);
  const previous = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;
    async function check() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/friends/summary", { cache: "no-store" });
        if (!response.ok || stopped) return;
        const data = (await response.json()) as { requests: number; challenges: number };
        const total = data.requests + data.challenges;
        if (previous.current !== null && total > previous.current) playSound("notify");
        previous.current = total;
        setCount(total);
      } catch {
        // Try again next time.
      }
    }
    void check();
    const timer = window.setInterval(check, 15_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <Link href="/friends" style={{ color: "var(--muted)" }} className="relative shrink-0 rounded-full px-3 py-1.5 hover:opacity-80 sm:px-0 sm:py-0">
      Friends
      {count > 0 && (
        <span className="ml-1.5 inline-grid min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-[18px] text-white" aria-label={`${count} new`}>
          {count}
        </span>
      )}
    </Link>
  );
}
