import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAvatarImage } from "@/lib/db/public";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  try {
    const image = await getAvatarImage(id, user?.id ?? null);
    if (!image) return new NextResponse(null, { status: 404 });
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.type,
        // The page adds ?v=<version>, so a new picture always gets a new URL.
        "Cache-Control": image.isPublic ? "public, max-age=86400" : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
