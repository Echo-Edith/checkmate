import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { dmKey, gameKey, listMessages, MAX_MESSAGE_LENGTH, sendMessage } from "@/lib/db/chat";
import { areFriends, publicIdToUserId } from "@/lib/db/friends";
import { getParticipants } from "@/lib/db/online";
import { getOrCreateProfile } from "@/lib/db/profiles";
import { checkRateLimit } from "@/lib/rate-limit";

const postSchema = z
  .object({ scope: z.enum(["game", "dm"]), target: z.string().length(24), text: z.string().min(1).max(5000) })
  .strict();

/** Works out which conversation this is, and refuses anyone who is not allowed in it. */
async function resolveKey(userId: string, scope: "game" | "dm", target: string): Promise<string | null> {
  if (scope === "game") {
    const players = await getParticipants(target);
    return players && (players.white === userId || players.black === userId) ? gameKey(target) : null;
  }
  const friendId = await publicIdToUserId(target);
  return friendId && (await areFriends(userId, friendId)) ? dmKey(userId, friendId) : null;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(`chat-read:${user.id}`, 120, 60_000)) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });

  const params = request.nextUrl.searchParams;
  const scope = params.get("scope");
  const target = params.get("target") ?? "";
  if ((scope !== "game" && scope !== "dm") || target.length !== 24) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const key = await resolveKey(user.id, scope, target);
    if (!key) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    return NextResponse.json({ messages: await listMessages(key, user.id, params.get("after") ?? undefined) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load messages." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!checkRateLimit(`chat-send:${user.id}`, 30, 60_000)) return NextResponse.json({ error: "You are sending messages too fast." }, { status: 429 });

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  if (!parsed.data.text.trim()) return NextResponse.json({ error: "Write something first." }, { status: 400 });

  try {
    const key = await resolveKey(user.id, parsed.data.scope, parsed.data.target);
    if (!key) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const profile = await getOrCreateProfile(user.id, user.email);
    return NextResponse.json({ message: await sendMessage(key, user.id, profile.username, parsed.data.text) });
  } catch {
    return NextResponse.json({ error: `Could not send (max ${MAX_MESSAGE_LENGTH} characters).` }, { status: 500 });
  }
}
