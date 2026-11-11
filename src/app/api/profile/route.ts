import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { BOARD_THEME_IDS, SITE_THEME_IDS } from "@/lib/themes";
import { getOrCreateProfile, updateProfile } from "@/lib/db/profiles";

const updateSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, "Pick a username")
      .max(24, "Keep it to 24 characters or fewer")
      // Any characters are fine (spaces, emoji, other languages), except invisible control characters.
      .refine((value) => !/[\p{Cc}\u200B-\u200F\u202A-\u202E\u2066-\u2069]/u.test(value), "Remove hidden control characters")
      .optional(),
    bio: z.string().trim().max(280).optional(),
    preferences: z
      .object({
        theme: z.enum(SITE_THEME_IDS).optional(),
        boardTheme: z.enum(BOARD_THEME_IDS).optional(),
        tutorPersonality: z.enum(["teacher", "coach", "analyst"]).optional(),
      })
      .strict()
      .optional(),
  })
  .strict(); // Unknown keys (including userId or stats) are rejected.

function unauthorized() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const profile = await getOrCreateProfile(user.id, user.email);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("GET /api/profile failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    await getOrCreateProfile(user.id, user.email);
    const profile = await updateProfile(user.id, parsed.data);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error("PATCH /api/profile failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
  }
}
