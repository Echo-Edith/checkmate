import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { FriendError, overview, publicIdToUserId, respond, sendRequest } from "@/lib/db/friends";
import { checkRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ action: z.enum(["request", "accept", "decline", "remove"]), id: z.string().length(24) }).strict();

function fail(error: unknown) {
  if (error instanceof FriendError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Friends route failed:", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(`friends-read:${user.id}`, 60, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  try {
    return NextResponse.json(await overview(user.id));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(`friends-act:${user.id}`, 30, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const target = await publicIdToUserId(parsed.data.id);
    if (!target) return NextResponse.json({ error: "Player not found" }, { status: 404 });
    if (parsed.data.action === "request") return NextResponse.json({ result: await sendRequest(user.id, target) });
    await respond(user.id, target, parsed.data.action);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
