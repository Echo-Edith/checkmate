import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getOwner } from "@/lib/admin-auth";
import { isMaintenanceOn, setMaintenance } from "@/lib/db/settings";

const bodySchema = z.object({ on: z.boolean() }).strict();

export async function GET() {
  if (!(await getOwner())) return new NextResponse(null, { status: 404 });
  try {
    return NextResponse.json({ on: await isMaintenanceOn() });
  } catch {
    return NextResponse.json({ error: "Could not read the setting." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await getOwner())) return new NextResponse(null, { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    await setMaintenance(parsed.data.on);
    return NextResponse.json({ on: parsed.data.on });
  } catch {
    return NextResponse.json({ error: "Could not save the setting." }, { status: 500 });
  }
}
