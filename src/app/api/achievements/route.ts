import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ACHIEVEMENT_BY_ID } from "@/lib/achievements";
import { checkAndAward, takeUnseen } from "@/lib/db/achievements";
import { checkRateLimit } from "@/lib/rate-limit";

/** Checks for new achievements and returns the ones the player has not seen yet. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ unlocked: [] });
  if (!checkRateLimit(`achievements:${user.id}`, 30, 60_000)) return NextResponse.json({ unlocked: [] });
  try {
    await checkAndAward(user.id);
    const ids = await takeUnseen(user.id);
    const unlocked = ids.map((id) => ACHIEVEMENT_BY_ID.get(id)).filter((item) => item !== undefined);
    return NextResponse.json({ unlocked }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ unlocked: [] });
  }
}
