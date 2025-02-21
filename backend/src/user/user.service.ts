import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { LoginService } from '../authentication/login/login.service';
import { ErrorHandlingService } from '../error-handling/error-handling.service';
import {
  UserAccount,
  UserProfile,
  UserFriend,
  StatisticsData,
  LeaderboardData,
  LeaderboardEntry,
  MatchHistoryData,
  Match,
  AchievementData,
} from './interfaces';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => LoginService))
    private readonly loginService: LoginService,
    private readonly errorHandlingService: ErrorHandlingService,
  ) {}

  getAvatarURL(avatar: Buffer | null): string {
    return avatar
      ? `data:image/jpeg;base64,${avatar.toString('base64')}`
      : `${process.env.URL_BACKEND}/images/default-avatar.png`;
  }

  async getUserAccountByToken(token: string): Promise<UserAccount> {
    const userID = await this.loginService.getUserIDFromCache(token);
    try {
      const user = await this.prisma.user.findUnique({
        where: { ID: userID },
        select: {
          ID: true,
          username: true,
          Enabled2FA: true,
          avatar: true,
        },
      });

      if (!user) throw new NotFoundException('User not found!');

      const avatarURL = this.getAvatarURL(user.avatar);

      return {
        ID: user.ID,
        username: user.username,
        Enabled2FA: user.Enabled2FA,
        avatarURL,
      };
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async getUserProfileByUserID(profileUserID: number, token: string): Promise<UserProfile> {
    const currentUserID = await this.loginService.getUserIDFromCache(token);

    try {
      const user = await this.prisma.user.findUnique({
      where: { ID: profileUserID },
      select: {
        ID: true,
        username: true,
        avatar: true,
        status: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const avatarURL = this.getAvatarURL(user.avatar);

    return {
      currentUserID,
      profileID: user.ID,
      username: user.username,
      status: user.status,
      avatarURL,
    };
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async getSocketIDByUserID(userID: number, token: string): Promise<string> {
    const currentUserID = await this.loginService.getUserIDFromCache(token);

    try {
      const user = await this.prisma.user.findUnique({
      where: { ID: userID },
      select: {
        websocketID: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return user.websocketID;
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async updateUsername(token: string, newUsername: string): Promise<User> {
    const userID = await this.loginService.getUserIDFromCache(token);

    try {
      const updatedUserWithUsername = await this.prisma.user.update({
        where: { ID: userID },
        data: { username: newUsername },
      });
      return updatedUserWithUsername;
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async updateAvatar(token: string, avatar: Buffer): Promise<User> {
    const userID = await this.loginService.getUserIDFromCache(token);

    try {
      return await this.prisma.user.update({
        where: { ID: userID },
        data: { avatar },
      });
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async getLeaderboard(): Promise<LeaderboardData[]> {
    try {
      const leaderboard: LeaderboardEntry[] = await this.prisma.statistics.findMany({
        orderBy: { ladderRank: 'desc' },
        take: 10,
        select: {
          user: {
            select: { ID: true, username: true, avatar: true },
          },
          ladderRank: true,
        },
      });

      return leaderboard.map((entry, index) => ({
        ID: entry.user.ID,
        username: entry.user.username,
        ladderRank: entry.ladderRank,
        avatarURL: this.getAvatarURL(entry.user.avatar),
        rank: index + 1,
      }));
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async getMatchHistory(userID: number): Promise<MatchHistoryData[]> {
    try {
        const matches: Match[] = await this.prisma.match.findMany({
        where: {
          status: 'FINISHED',
          players: {
            some: {
              ID: userID,
            },
          },
        },
        include: {
          players: {
            select: { ID: true, username: true },
          },
        },
      });

      if (!matches || matches.length === 0) {
        return [];
      }

      return matches.map((match: Match) => {
        const isPlayer1 = match.players[0].ID === userID;
        const opponent = match.players.find((player) => player.ID !== userID);

        return {
          opponentID: opponent?.ID ?? -1,
          opponent: opponent?.username ?? 'Unknown',
          scoreLeft: isPlayer1 ? match.scoreLeft : match.scoreRight,
          scoreRight: isPlayer1 ? match.scoreRight : match.scoreLeft,
          result: isPlayer1
          ? match.scoreLeft > match.scoreRight
            ? 'Win'
            : 'Loss'
          : match.scoreRight > match.scoreLeft
          ? 'Win'
          : 'Loss',
        };
      });
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async getUserAchievements(userID: number): Promise<AchievementData[]> {
    try {
      const [allAchievements, userAchievements] = await Promise.all([
        this.prisma.achievement.findMany(),
        this.prisma.userAchievement.findMany({ where: { userID } }),
      ]);

      const unlockedAchievementIDs = new Set(userAchievements.map((ua) => ua.achievementID));

      return allAchievements.map((achievement) => ({
        name: achievement.name,
        description: achievement.description,
        iconURL: achievement.iconURL,
        unlocked: unlockedAchievementIDs.has(achievement.ID),
      }));
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async getFriends(token: string): Promise<UserFriend[]> {
    const userID = await this.loginService.getUserIDFromCache(token);
    if (!userID) throw new NotFoundException('User Unauthorized.');
     try {
        const user = await this.prisma.user.findUnique({
          where: { ID: userID },
          include: {
            friends: {
              select: {
                ID: true,
                username: true,
                avatar: true,
                status: true,
              },
            },
          },
        });

        if (!user || !user.friends) {
          throw new NotFoundException('No friends found');
        }

        return user.friends.map((friend) => ({
          ID: friend.ID,
          username: friend.username,
          avatarURL: this.getAvatarURL(friend.avatar),
          status: friend.status,
        }));
      } catch (error) {
        this.errorHandlingService.throwHttpException(error);
      }
    }

  async getFriendshipStatus(token: string, targetUserID: number): Promise<boolean> {
    const userID = await this.loginService.getUserIDFromCache(token);

    try {
      const userCount = await this.prisma.user.count({
        where: {
          ID: userID,
          friends: { some: { ID: targetUserID } },
        },
      });
      return userCount > 0;
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async toggleFriendship(token: string, targetUserID: number): Promise<string> {
    const userID = await this.loginService.getUserIDFromCache(token);

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        const isFriend = await prisma.user.count({
          where: {
            ID: userID,
            friends: { some: { ID: targetUserID } },
          },
        });

        if (isFriend) {
          await prisma.user.update({
            where: { ID: userID },
            data: { friends: { disconnect: { ID: targetUserID } } },
          });

          await prisma.user.update({
            where: { ID: targetUserID },
            data: { friendsOf: { disconnect: { ID: userID } } },
          });

          return `You unfriended user ${targetUserID}`;
        } else {
          await prisma.user.update({
            where: { ID: userID },
            data: { friends: { connect: { ID: targetUserID } } },
          });

          await prisma.user.update({
            where: { ID: targetUserID },
            data: { friendsOf: { connect: { ID: userID } } },
          });

          return `You befriended user ${targetUserID}`;
        }
      });

      return result;
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  // FOR LATER: REMOVE winRate and playerRating CALCULATION LOGIC FROM getUserStats FUNCTION
  // TO GAME LOGIC WHENEVER A GAME IS FINISHED
  async getUserStats(userID: number): Promise<StatisticsData> {
    try {
      const statistics = await this.prisma.statistics.findUnique({
        where: { userID: userID },
      });

      if (!statistics) throw new NotFoundException('Statistics not found!');

      // Calculate win rate and ladder rank -> we will later move this to game logic
      const winRate = statistics.gamesPlayed ? statistics.wins / statistics.gamesPlayed : 0;
      const playerRating = Math.round(winRate * 100 + statistics.totalScores / 10);

      // Update the ladder rank in the database -> we will later move this to game logic
      await this.prisma.statistics.update({
        where: { userID },
        data: { ladderRank: playerRating },
      });

      // Check and grant XP-related achievements -> we will later move this to game logic
      await this.checkAndGrantXPAchievements(userID, playerRating);

      return {
        ...statistics,
        winRate,
        ladderRank: playerRating,
      };
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  // FOR LATER: REMOVE CALCULATION LOGIC FROM getUserStats FUNCTION
  // TO GAME LOGIC WHENEVER A GAME IS FINISHED
  // IN FUNCTION LOOKING SOMEWHAT LIKE THIS:
  async updateGameStats(userID: number, gameResult: { won: boolean; score: number }): Promise<StatisticsData> {
    try {
      // Fetch the current statistics
      const statistics = await this.prisma.statistics.findUnique({
        where: { userID },
      });

      if (!statistics) {
        throw new NotFoundException('Statistics not found.');
      }

      // Update gamesPlayed, wins, and totalScores based on the game result
      const updatedStats = {
        gamesPlayed: statistics.gamesPlayed + 1,
        wins: gameResult.won ? statistics.wins + 1 : statistics.wins,
        totalScores: statistics.totalScores + gameResult.score,
      };

      // Calculate the new ladderRank (playerRating)
      const winRate = updatedStats.gamesPlayed ? updatedStats.wins / updatedStats.gamesPlayed : 0;
      const playerRating = Math.round(winRate * 100 + updatedStats.totalScores / 10);

      // Update the statistics in the database
      const updatedStatistics = await this.prisma.statistics.update({
        where: { userID },
        data: { ...updatedStats, ladderRank: playerRating },
      });

      return {
        ...updatedStatistics,
        winRate,
        ladderRank: playerRating,
      };
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  // FOR LATER: REMOVE checkAndGrantXPAchievements from user.service.ts
  // TO GAME LOGIC WHENEVER A GAME IS FINISHED
  async checkAndGrantXPAchievements(userID: number, playerRating: number): Promise<void> {
    try {
      const xpAchievements = [
        { name: 'Scored 100 XP', threshold: 100 },
        { name: 'Scored 1000 XP', threshold: 1000 },
      ];

      for (const achievement of xpAchievements) {
        if (playerRating >= achievement.threshold) {
          const achievementData = await this.prisma.achievement.findUnique({
            where: { name: achievement.name },
          });

          if (!achievementData) {
            throw new Error(`Achievement "${achievement.name}" not found.`);
          }

          const alreadyGranted = await this.prisma.userAchievement.findFirst({
            where: { userID, achievementID: achievementData.ID },
          });

          if (!alreadyGranted) {
            await this.prisma.userAchievement.create({
              data: { userID, achievementID: achievementData.ID },
            });
            // console.log(`Achievement "${achievement.name}" granted to user ${userID}. 🎉`);
          }
        }
      }
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }
}
