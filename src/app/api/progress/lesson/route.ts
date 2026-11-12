import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getLesson } from "@/lib/content/lessons";
import { generatedLessonNumber, generatedPractice } from "@/lib/content/lesson-source";
import { evaluateAttempt } from "@/lib/content/verify";
import { getOrCreateProfile } from "@/lib/db/profiles";
import { completeLesson, DailyLimitError } from "@/lib/db/progress";

const bodySchema = z
  .object({
    lessonId: z.string().max(60),
    /** The player's moves (UCI) for the practice position, if the lesson has one. */
    moves: z.array(z.string().max(5)).max(12).default([]),
  })
  .strict();

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const generatedNumber = generatedLessonNumber(parsed.data.lessonId);
  let lesson: { id: string; practice?: ReturnType<typeof generatedPractice> } | undefined = getLesson(parsed.data.lessonId);
  if (!lesson && generatedNumber !== null) {
    try {
      lesson = { id: parsed.data.lessonId, practice: generatedPractice(generatedNumber) };
    } catch {
      return NextResponse.json({ error: "Could not load the lesson." }, { status: 500 });
    }
  }
  if (!lesson) return NextResponse.json({ error: "Unknown lesson" }, { status: 404 });

  // The practice position must really be solved. The server re-checks the moves.
  if (lesson.practice) {
    const result = evaluateAttempt(lesson.practice.fen, lesson.practice.lines, parsed.data.moves, lesson.practice.mateAny);
    if (result.status !== "solved") {
      return NextResponse.json({ error: "Solve the practice position to finish this lesson." }, { status: 400 });
    }
  }

  try {
    await getOrCreateProfile(user.id, user.email);
    const lessons = await completeLesson(user.id, lesson.id);
    return NextResponse.json({ lessons });
  } catch (error) {
    if (error instanceof DailyLimitError) return NextResponse.json({ error: error.message }, { status: 429 });
    console.error("POST /api/progress/lesson failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not save progress" }, { status: 500 });
  }
}
