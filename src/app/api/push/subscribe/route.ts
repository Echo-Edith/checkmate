import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { removePushSubscription, savePushSubscription } from "@/lib/db/push";
import { checkRateLimit } from "@/lib/rate-limit";

const endpoint = z.string().url().max(1000).startsWith("https://");
const subscribeSchema = z
  .object({ endpoint, keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }) })
  .strict();
const unsubscribeSchema = z.object({ endpoint }).strict();

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(`push-sub:${user.id}`, 20, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  const parsed = subscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  await savePushSubscription(user.id, parsed.data.endpoint, parsed.data.keys);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await removePushSubscription(user.id, parsed.data.endpoint);
  return NextResponse.json({ ok: true });
}
