import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { incomingCount } from "@/lib/db/friends";
import { countChallenges } from "@/lib/db/online";

/** Small number counts for the notification dot in the navigation bar. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ requests: 0, challenges: 0 });
  try {
    const [requests, challenges] = await Promise.all([incomingCount(user.id), countChallenges(user.id)]);
    return NextResponse.json({ requests, challenges }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ requests: 0, challenges: 0 });
  }
}
