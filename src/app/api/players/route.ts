import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listPublicPlayers } from "@/lib/db/public";
import { checkRateLimit } from "@/lib/rate-limit";

/** Search public players by name (used to find friends). Needs a login. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(`player-search:${user.id}`, 40, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  try {
    const players = await listPublicPlayers({ search: request.nextUrl.searchParams.get("q") ?? "", limit: 12 });
    return NextResponse.json({
      players: players.map((p) => ({ id: p.id, username: p.username, avatarVersion: p.avatarVersion, badges: p.badges })),
    });
  } catch {
    return NextResponse.json({ error: "Could not search." }, { status: 500 });
  }
}
