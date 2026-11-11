import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { clearAvatar, getOrCreateProfile, setAvatar } from "@/lib/db/profiles";

const MAX_BYTES = 60_000;
const DATA_URL = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/;

/** Checks the real file signature, not just what the browser claims. */
function matchesType(bytes: Buffer, type: string): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/webp") return bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP";
  return false;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { image?: unknown } | null;
  const match = typeof body?.image === "string" ? DATA_URL.exec(body.image) : null;
  if (!match?.[1] || !match[2]) return NextResponse.json({ error: "Please choose a JPG, PNG or WebP image." }, { status: 400 });

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > MAX_BYTES) return NextResponse.json({ error: "That image is too big." }, { status: 413 });
  if (!matchesType(bytes, match[1])) return NextResponse.json({ error: "That file is not a valid image." }, { status: 400 });

  try {
    await getOrCreateProfile(user.id, user.email);
    const updatedAt = await setAvatar(user.id, { data: match[2], type: match[1] as "image/webp" | "image/jpeg" | "image/png" });
    return NextResponse.json({ version: updatedAt.getTime() });
  } catch {
    return NextResponse.json({ error: "Could not save the picture." }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    await clearAvatar(user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not remove the picture." }, { status: 500 });
  }
}
