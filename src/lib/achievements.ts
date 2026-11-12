/** All achievements. Each one unlocks by itself when the player passes its goal. */

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  text: string;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: "first_game", name: "First steps", icon: "♟️", text: "Finish your first game" },
  { id: "first_win", name: "First win", icon: "🏆", text: "Win a game" },
  { id: "wins_10", name: "Winner", icon: "🥉", text: "Win 10 games" },
  { id: "wins_50", name: "Champion", icon: "🥇", text: "Win 50 games" },
  { id: "games_25", name: "Regular", icon: "🎮", text: "Play 25 games" },
  { id: "online_first", name: "Online debut", icon: "🌍", text: "Finish an online game" },
  { id: "online_win", name: "Online winner", icon: "⚔️", text: "Win an online game" },
  { id: "puzzle_first", name: "Puzzle starter", icon: "🧩", text: "Solve a puzzle" },
  { id: "puzzles_10", name: "Puzzle fan", icon: "🔎", text: "Solve 10 puzzles" },
  { id: "puzzles_all", name: "Puzzle master", icon: "🧠", text: "Solve every puzzle" },
  { id: "streak_5", name: "On fire", icon: "🔥", text: "Solve 5 puzzles in a row" },
  { id: "lesson_first", name: "Student", icon: "📘", text: "Finish a lesson" },
  { id: "lessons_all", name: "Graduate", icon: "🎓", text: "Finish every lesson" },
  { id: "rating_1400", name: "Rising star", icon: "⭐", text: "Reach a rating of 1400" },
  { id: "rating_1600", name: "Club player", icon: "🌟", text: "Reach a rating of 1600" },
  { id: "rating_1800", name: "Expert", icon: "💫", text: "Reach a rating of 1800" },
  { id: "rating_2000", name: "Master", icon: "👑", text: "Reach a rating of 2000" },
  { id: "friend_first", name: "Friendly", icon: "🤝", text: "Make a friend" },
  { id: "friends_5", name: "Popular", icon: "🎉", text: "Have 5 friends" },
  { id: "avatar", name: "Picture perfect", icon: "📸", text: "Add a profile picture" },
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

/** Everything the goals are measured against. */
export interface AchievementContext {
  gamesPlayed: number;
  gamesWon: number;
  onlineGames: number;
  onlineWins: number;
  puzzlesSolved: number;
  totalPuzzles: number;
  bestStreak: number;
  lessonsDone: number;
  totalLessons: number;
  peakRating: number;
  friends: number;
  hasAvatar: boolean;
}

/** The IDs of every achievement the player has reached right now. */
export function earnedIds(c: AchievementContext): string[] {
  const checks: Record<string, boolean> = {
    first_game: c.gamesPlayed >= 1 || c.onlineGames >= 1,
    first_win: c.gamesWon >= 1 || c.onlineWins >= 1,
    wins_10: c.gamesWon >= 10,
    wins_50: c.gamesWon >= 50,
    games_25: c.gamesPlayed >= 25,
    online_first: c.onlineGames >= 1,
    online_win: c.onlineWins >= 1,
    puzzle_first: c.puzzlesSolved >= 1,
    puzzles_10: c.puzzlesSolved >= 10,
    puzzles_all: c.totalPuzzles > 0 && c.puzzlesSolved >= c.totalPuzzles,
    streak_5: c.bestStreak >= 5,
    lesson_first: c.lessonsDone >= 1,
    lessons_all: c.totalLessons > 0 && c.lessonsDone >= c.totalLessons,
    rating_1400: c.peakRating >= 1400,
    rating_1600: c.peakRating >= 1600,
    rating_1800: c.peakRating >= 1800,
    rating_2000: c.peakRating >= 2000,
    friend_first: c.friends >= 1,
    friends_5: c.friends >= 5,
    avatar: c.hasAvatar,
  };
  return ACHIEVEMENTS.filter((achievement) => checks[achievement.id]).map((achievement) => achievement.id);
}
