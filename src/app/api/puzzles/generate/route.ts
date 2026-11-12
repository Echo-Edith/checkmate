import { NextResponse, type NextRequest } from "next/server";
import { generateMatePuzzle } from "@/lib/content/generate";

export const maxDuration = 20;

export async function GET(request: NextRequest) {
  const seed = Number(request.nextUrl.searchParams.get("seed"));
  if (!Number.isInteger(seed) || seed < 1 || seed > 9_999_999) {
    return NextResponse.json({ error: "Invalid seed" }, { status: 400 });
  }
  try {
    return NextResponse.json({ puzzle: generateMatePuzzle(seed) }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch {
    return NextResponse.json({ error: "Could not make a puzzle. Try again." }, { status: 500 });
  }
}
