export interface StatisticsData {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalScores: number;
  winRate: number;
  ladderRank: number;
}

export interface MatchHistoryData {
  opponentID: number;
  opponent: string;
  scorePlayer1: number;
  scorePlayer2: number;
  result: string;
}

export interface LeaderboardData {
  ID: number;
  username: string;
  avatarURL: string;
  ladderRank: number;
  rank: number;
}

export interface AchievementsData {
  name: string;
  description: string;
  iconURL: string;
  unlocked: boolean;
}
