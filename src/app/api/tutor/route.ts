import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPuzzle } from "@/lib/content/puzzles";
import { checkRateLimit } from "@/lib/rate-limit";
import { GeminiError, streamGemini } from "@/lib/tutor/gemini";
import { buildSystemPrompt, buildUserPrompt, isValidFen } from "@/lib/tutor/prompts";
import { tutorRequestSchema } from "@/lib/tutor/schema";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Log in to use the AI tutor." }, { status: 401 });

  if (!checkRateLimit(`tutor:${user.id}`, 15, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = tutorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const data = parsed.data;

  if ("fen" in data && data.fen && !isValidFen(data.fen)) {
    return NextResponse.json({ error: "Invalid position" }, { status: 400 });
  }

  try {
    let prompt;
    if (data.kind === "puzzle_hint") {
      const puzzle = getPuzzle(data.puzzleId);
      if (!puzzle) return NextResponse.json({ error: "Unknown puzzle" }, { status: 404 });
      prompt = buildUserPrompt({ request: data, puzzle });
    } else {
      prompt = buildUserPrompt({ request: data });
    }

    const stream = await streamGemini(buildSystemPrompt(prompt.persona), prompt.text);
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("POST /api/tutor failed:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
