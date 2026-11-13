import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isOwnerEmail } from "@/lib/badges";
import { createSharedReplay, deleteSharedReplay, listSharedReplays, SHARE_ID } from "@/lib/db/shared";
import { checkRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({ moves: z.array(z.string().min(2).max(10)).min(1).max(400) }).strict();

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in to share a replay." }, { status: 401 });
  if (!checkRateLimit(`share:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid game" }, { status: 400 });
  try {
    const id = await createSharedReplay(user.id, parsed.data.moves);
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof Error && error.message === "Too many links") return NextResponse.json({ error: "You have 100 shared links. Delete some first." }, { status: 400 });
    if (error instanceof Error && error.message === "Invalid game") return NextResponse.json({ error: "Invalid game" }, { status: 400 });
    console.error("POST /api/share failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not make the link. Try again." }, { status: 500 });
  }
}

/** The links this player made. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  try {
    return NextResponse.json({ links: await listSharedReplays(user.id) });
  } catch {
    return NextResponse.json({ error: "Could not load your links." }, { status: 500 });
  }
}

/** Deletes one link. The link stops working at once. */
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!SHARE_ID.test(id)) return NextResponse.json({ error: "Invalid link" }, { status: 400 });
  try {
    const deleted = await deleteSharedReplay(id, user.id, isOwnerEmail(user.email));
    if (!deleted) return NextResponse.json({ error: "Link not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete the link." }, { status: 500 });
  }
}
