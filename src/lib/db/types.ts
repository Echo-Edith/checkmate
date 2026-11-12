import type { BoardThemeId, SiteThemeId } from "@/lib/themes";
/**
 * Shape of documents stored in MongoDB.
 * Every user-owned document carries the verified Supabase user ID in `userId`.
 */

export interface UserPreferences {
  theme: SiteThemeId;
  boardTheme: BoardThemeId;
  tutorPersonality: "teacher" | "coach" | "analyst";
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  draws: number;
  puzzlesAttempted: number;
  puzzlesSolved: number;
  lessonsCompleted: number;
}

/** Small profile picture (resized to about 192px in the browser, well under 60 KB). */
export interface UserAvatar {
  /** Base64-encoded image bytes. Left out of normal profile reads. */
  data: string;
  type: "image/webp" | "image/jpeg" | "image/png";
  updatedAt: Date;
}

export interface UserProfileDoc {
  /** Supabase auth user ID (unique). Also the ownership key. */
  userId: string;
  username: string;
  bio: string;
  /** Show on the public players list. Missing means public. */
  isPublic?: boolean;
  avatar?: UserAvatar;
  /** True for the site owner. Set on the server from the verified email, never by the client. */
  isOwner?: boolean;
  /** Beta tester badge. Only the owner can change this, from the owner panel. */
  isBeta?: boolean;
  /** Elo rating. Missing means 1200. Only the server changes it. */
  rating?: number;
  ratingGames?: number;
  peakRating?: number;
  onlineGames?: number;
  onlineWins?: number;
  achievements?: Array<{ id: string; at: Date; seen: boolean }>;
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  boardTheme: "classic",
  tutorPersonality: "teacher",
};

export const DEFAULT_STATS: UserStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  draws: 0,
  puzzlesAttempted: 0,
  puzzlesSolved: 0,
  lessonsCompleted: 0,
};
