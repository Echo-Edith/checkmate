import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/db/profiles";
import { OnlineError, quickMatch } from "@/lib/db/online";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(`online-quick:${user.id}`, 10, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  try {
    const profile = await getOrCreateProfile(user.id, user.email);
    return NextResponse.json({ id: await quickMatch(user.id, profile.username) });
  } catch (error) {
    if (error instanceof OnlineError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
