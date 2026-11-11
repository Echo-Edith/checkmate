import { NextResponse, type NextRequest } from "next/server";
import { getOwner } from "@/lib/admin-auth";
import { listUsers } from "@/lib/db/admin";

export async function GET(request: NextRequest) {
  // Owner only. Anyone else gets the same answer as a page that does not exist.
  if (!(await getOwner())) return new NextResponse(null, { status: 404 });
  try {
    return NextResponse.json(await listUsers({ search: request.nextUrl.searchParams.get("q") ?? "" }));
  } catch {
    return NextResponse.json({ error: "Could not load users." }, { status: 500 });
  }
}
