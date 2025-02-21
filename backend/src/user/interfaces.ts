import { Statistics, UserStatus, MatchStatus } from '@prisma/client';

export interface UserAccount {
  ID: number;
  username: string;
  Enabled2FA: boolean;
  avatarURL: string;
}

export interface UserProfile {
  currentUserID: number;
  profileID: number;
  username: string;
  avatarURL: string;
  status: UserStatus;
}

export interface UploadedFileType {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }

export interface UserFriend {
  ID: number;
  username: string;
  avatarURL: string;
  status: UserStatus;
}

export interface StatisticsData extends Statistics {
  winRate: number;
}

export interface LeaderboardData {
  ID: number;
  username: string;
  ladderRank: number;
  avatarURL: string;
  rank: number;
}

export interface MatchHistoryData {
  opponentID: number;
  opponent: string;
  scoreLeft: number;
  scoreRight: number;
  result: string;
}

export interface AchievementData {
  name: string;
  description: string;
  iconURL: string;
  unlocked: boolean;
}

export interface Match {
  players: { ID: number; username: string }[];
  scoreLeft: number;
  scoreRight: number;
  status: MatchStatus;
}

export interface LeaderboardEntry {
  user: { ID: number, username: string; avatar: Buffer | null };
  ladderRank: number;
}
