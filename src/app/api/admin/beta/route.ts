import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOwner } from "@/lib/admin-auth";
import { setBeta } from "@/lib/db/admin";

const bodySchema = z.object({ id: z.string().length(24), beta: z.boolean() }).strict();

export async function POST(request: NextRequest) {
  if (!(await getOwner())) return new NextResponse(null, { status: 404 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    const found = await setBeta(parsed.data.id, parsed.data.beta);
    return found ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "User not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not update the user." }, { status: 500 });
  }
}
