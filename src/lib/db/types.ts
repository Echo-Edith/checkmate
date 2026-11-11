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

export interface UserProfileDoc {
  /** Supabase auth user ID (unique). Also the ownership key. */
  userId: string;
  username: string;
  bio: string;
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
