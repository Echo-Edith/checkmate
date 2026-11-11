import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteGame, getGame } from "@/lib/db/games";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  try {
    const game = await getGame(user.id, id);
    if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    return NextResponse.json({ game });
  } catch (error) {
    console.error("GET /api/games/[id] failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not load the game" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;

  try {
    const deleted = await deleteGame(user.id, id);
    if (!deleted) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/games/[id] failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not delete the game" }, { status: 500 });
  }
}
