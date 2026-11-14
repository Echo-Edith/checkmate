import { NextResponse } from "next/server";
import { getOwner } from "@/lib/admin-auth";
import { clearAiErrors, listAiErrors } from "@/lib/db/ai-errors";

export async function GET() {
  if (!(await getOwner())) return new NextResponse(null, { status: 404 });
  try {
    const rows = await listAiErrors(50);
    return NextResponse.json({ errors: rows.map((row) => ({ ...row, at: row.at.toISOString() })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not read the AI error log." }, { status: 500 });
  }
}

export async function DELETE() {
  if (!(await getOwner())) return new NextResponse(null, { status: 404 });
  try {
    await clearAiErrors();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not clear the log." }, { status: 500 });
  }
}
