import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { decideResult } from "@/lib/game-result";
import { countGames, insertGame, listGames, MAX_GAMES_PER_USER, type GameDoc } from "@/lib/db/games";
import { botRatingChange } from "@/lib/elo";
import { applyRatingDelta, getOrCreateProfile, getRatingInfo, incrementStats } from "@/lib/db/profiles";

const bodySchema = z
  .object({
    moves: z.array(z.string().min(2).max(10)).min(1).max(600),
    color: z.enum(["w", "b"]),
    mode: z.enum(["computer", "pvp"]),
    level: z.number().int().min(0).max(20).nullable(),
    resigned: z.boolean(),
  })
  .strict();

function unauthorized() {
  return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json({ games: await listGames(user.id, 50) });
  } catch (error) {
    console.error("GET /api/games failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not load games" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid game data" }, { status: 400 });
  const { moves, color, mode, level, resigned } = parsed.data;

  // Decide the result on the server from the moves. The client result is never trusted,
  // and reaching the end of the move list is never treated as a loss.
  const decision = decideResult(moves, color, mode, resigned);
  if (!decision.ok) {
    if (decision.error === "illegal") {
      return NextResponse.json({ error: "The game contains an illegal move." }, { status: 400 });
    }
    return NextResponse.json({ error: "Only finished games can be saved." }, { status: 400 });
  }
  const result: GameDoc["result"] = decision.result;

  try {
    if ((await countGames(user.id)) >= MAX_GAMES_PER_USER) {
      return NextResponse.json(
        { error: `You have saved ${MAX_GAMES_PER_USER} games. Delete some old games to save new ones.` },
        { status: 409 },
      );
    }

    await getOrCreateProfile(user.id, user.email);
    const id = await insertGame({
      userId: user.id,
      moves: moves.join(" "),
      result,
      color,
      mode,
      level,
      resigned: decision.resigned,
      plies: moves.length,
      createdAt: new Date(),
    });

    // Only games against the computer count toward win/loss statistics.
    let ratingDelta: number | null = null;
    if (mode === "computer") {
      const won = (result === "1-0" && color === "w") || (result === "0-1" && color === "b");
      const draw = result === "1/2-1/2";
      await incrementStats(user.id, {
        gamesPlayed: 1,
        gamesWon: won ? 1 : 0,
        gamesLost: !won && !draw ? 1 : 0,
        draws: draw ? 1 : 0,
      });

      // Rating moves a little against the bot, and never above the bot cap.
      const info = await getRatingInfo(user.id);
      ratingDelta = botRatingChange(info.rating, level, won ? 1 : draw ? 0.5 : 0, info.ratingGames);
      await applyRatingDelta(user.id, ratingDelta);
    }

    return NextResponse.json({ id, result, ratingDelta });
  } catch (error) {
    console.error("POST /api/games failed:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not save the game" }, { status: 500 });
  }
}
