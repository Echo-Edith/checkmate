import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { publicIdToUserId, statusWith } from "@/lib/db/friends";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ status: "guest" });
  const target = await publicIdToUserId(request.nextUrl.searchParams.get("id") ?? "").catch(() => null);
  if (!target) return NextResponse.json({ status: "none" });
  try {
    return NextResponse.json({ status: await statusWith(user.id, target) });
  } catch {
    return NextResponse.json({ status: "none" });
  }
}
