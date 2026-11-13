import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createSharedReplay } from "@/lib/db/shared";
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
    if (error instanceof Error && error.message === "Invalid game") return NextResponse.json({ error: "Invalid game" }, { status: 400 });
    console.error("POST /api/share failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not make the link. Try again." }, { status: 500 });
  }
}
