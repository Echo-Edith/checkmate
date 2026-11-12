/** Elo rating maths. Everyone starts at 1200. */

export const START_RATING = 1200;
export const MIN_RATING = 100;
/** Fewer rated games than this and the rating is still "provisional" (shown with a ?). */
export const PROVISIONAL_GAMES = 5;
/** Games against the bot can never lift a rating above this. Only real players can. */
export const BOT_RATING_CAP = 1600;

/** The bot's strength per level, matched to the engine skill number the game saves (0, 3, 10, 16, 20). */
export function botRating(level: number | null): number {
  if (level === null) return 1600;
  if (level <= 1) return 600;
  if (level <= 5) return 1000;
  if (level <= 12) return 1600;
  if (level <= 17) return 2200;
  return 2800;
}

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

/** New players move fast, then settle down. */
export function kFactor(ratedGames: number, rating: number): number {
  if (ratedGames < 20) return 40;
  return rating >= 2400 ? 16 : 24;
}

/** Points gained or lost. `score` is 1 for a win, 0.5 for a draw, 0 for a loss. */
export function ratingChange(rating: number, opponent: number, score: number, k: number): number {
  return Math.round(k * (score - expectedScore(rating, opponent)));
}

/** Change for a game against the bot: smaller steps, and never above the bot cap. */
export function botRatingChange(rating: number, level: number | null, score: number, ratedGames: number): number {
  const delta = ratingChange(rating, botRating(level), score, Math.min(16, kFactor(ratedGames, rating)));
  if (delta > 0) return Math.max(0, Math.min(delta, BOT_RATING_CAP - rating));
  return delta;
}
