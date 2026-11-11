import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { cancelGame, drawAction, getGame, joinGame, OnlineError, playMove, resign } from "@/lib/db/online";
import { getOrCreateProfile } from "@/lib/db/profiles";
import { checkRateLimit } from "@/lib/rate-limit";

const square = z.string().regex(/^[a-h][1-8]$/);
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("join") }).strict(),
  z.object({ action: z.literal("cancel") }).strict(),
  z.object({ action: z.literal("resign") }).strict(),
  z.object({ action: z.literal("offer_draw") }).strict(),
  z.object({ action: z.literal("accept_draw") }).strict(),
  z.object({ action: z.literal("decline_draw") }).strict(),
  z
    .object({ action: z.literal("move"), from: square, to: square, promotion: z.enum(["q", "r", "b", "n"]).optional(), ply: z.number().int().min(0).max(1000) })
    .strict(),
]);

interface Context {
  params: Promise<{ id: string }>;
}

function fail(error: unknown) {
  if (error instanceof OnlineError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Online game route failed:", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function GET(request: NextRequest, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(`online-poll:${user.id}`, 120, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });

  const { id } = await params;
  const sinceParam = request.nextUrl.searchParams.get("v");
  const since = sinceParam !== null && /^\d+$/.test(sinceParam) ? Number(sinceParam) : undefined;
  try {
    const game = await getGame(id, user.id, since);
    if (game === null) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    return NextResponse.json(game === "unchanged" ? { unchanged: true } : { game }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(`online-act:${user.id}`, 60, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const data = parsed.data;
  const { id } = await params;

  try {
    switch (data.action) {
      case "join": {
        const profile = await getOrCreateProfile(user.id, user.email);
        return NextResponse.json({ game: await joinGame(id, user.id, profile.username) });
      }
      case "cancel":
        await cancelGame(id, user.id);
        return NextResponse.json({ ok: true });
      case "resign":
        return NextResponse.json({ game: await resign(id, user.id) });
      case "offer_draw":
        return NextResponse.json({ game: await drawAction(id, user.id, "offer") });
      case "accept_draw":
        return NextResponse.json({ game: await drawAction(id, user.id, "accept") });
      case "decline_draw":
        return NextResponse.json({ game: await drawAction(id, user.id, "decline") });
      case "move":
        return NextResponse.json({ game: await playMove(id, user.id, { from: data.from, to: data.to, promotion: data.promotion }, data.ply) });
    }
  } catch (error) {
    return fail(error);
  }
}
