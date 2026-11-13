import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOwner } from "@/lib/admin-auth";
import { aiUseToday, getAiDailyLimit, setAiDailyLimit } from "@/lib/db/settings";

// A number of free messages per player per day, or null for unlimited.
const bodySchema = z.object({ limit: z.number().int().min(0).max(10_000).nullable() }).strict();

async function current() {
  const [limit, used] = await Promise.all([getAiDailyLimit(), aiUseToday()]);
  return { limit, used };
}

export async function GET() {
  if (!(await getOwner())) return new NextResponse(null, { status: 404 });
  try {
    return NextResponse.json(await current());
  } catch {
    return NextResponse.json({ error: "Could not read the setting." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await getOwner())) return new NextResponse(null, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a whole number from 0 to 10000." }, { status: 400 });
  try {
    await setAiDailyLimit(parsed.data.limit);
    return NextResponse.json(await current());
  } catch {
    return NextResponse.json({ error: "Could not save the setting." }, { status: 500 });
  }
}
