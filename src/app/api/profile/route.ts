import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getOrCreateProfile, updateProfile } from "@/lib/db/profiles";

const updateSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only")
      .optional(),
    bio: z.string().trim().max(280).optional(),
    preferences: z
      .object({
        theme: z.enum(["system", "light", "dark"]).optional(),
        boardTheme: z.enum(["classic", "green", "blue"]).optional(),
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
