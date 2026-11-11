import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { PERSONAS } from "@/lib/tutor/schema";
import { synthesizeSpeech, TtsError } from "@/lib/tutor/tts";

export const maxDuration = 30;

const bodySchema = z.object({ text: z.string().trim().min(1).max(700), persona: z.enum(PERSONAS).default("teacher") }).strict();

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in to use the natural voice." }, { status: 401 });
  if (!checkRateLimit(`tts:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const wav = await synthesizeSpeech(parsed.data.text, parsed.data.persona);
    return new Response(new Uint8Array(wav), { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=3600" } });
  } catch (error) {
    if (error instanceof TtsError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Voice failed." }, { status: 500 });
  }
}
