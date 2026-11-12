import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateProfile } from "@/lib/db/profiles";
import { areFriends, publicIdToUserId } from "@/lib/db/friends";
import { createGame, lobby, OnlineError } from "@/lib/db/online";
import { checkRateLimit } from "@/lib/rate-limit";

const createSchema = z.object({ color: z.enum(["w", "b", "random"]), friendId: z.string().length(24).optional() }).strict();

function fail(error: unknown) {
  if (error instanceof OnlineError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Online games route failed:", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(`online-read:${user.id}`, 60, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  try {
    return NextResponse.json(await lobby(user.id));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(`online-create:${user.id}`, 10, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const profile = await getOrCreateProfile(user.id, user.email);
    let invite: string | null = null;
    if (parsed.data.friendId) {
      invite = await publicIdToUserId(parsed.data.friendId);
      if (!invite || !(await areFriends(user.id, invite))) throw new OnlineError("You can only challenge your friends.", 403);
    }
    return NextResponse.json({ id: await createGame(user.id, profile.username, parsed.data.color, invite) });
  } catch (error) {
    return fail(error);
  }
}
