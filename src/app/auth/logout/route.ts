import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST only, so logging out cannot be triggered by a simple link or image request. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 turns the POST into a GET on the target page.
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });
}
