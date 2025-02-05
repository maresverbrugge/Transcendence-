import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { Socket, Namespace } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { Channel, ChannelMember, User, Message } from '@prisma/client';

import { ChannelMemberService } from '../channel-member/channel-member.service';
import { MessageService } from '../message/message.service';
import { HashingService } from '../hashing/hashing.service';
import { LoginService } from 'src/authentication/login/login.service';
import { UserService } from 'src/user/user.service';
import { ErrorHandlingService } from 'src/error-handling/error-handling.service';
import { GatewayService } from '../gateway/gateway.service';
import { UserProfile } from 'src/user/interfaces';

type ChannelResponse = {
    ID: number;
    name: string;
    isPrivate: boolean;
    isDM: boolean;
    passwordEnabled: boolean;
    ownerID: number;
}

type ChannelWithMembersAndMessages = ChannelResponse & {
  members: (ChannelMember & {
    user: Pick<User, 'ID' | 'username'>;
  })[];
  messages: Message[];
};

type ChannelWithMembers = ChannelResponse & {
  members: (ChannelMember & {
    user: Pick<User, 'ID' | 'username'>;
  })[];
};

type newChannelData = {
    name: string;
    isPrivate: boolean;
    isDM: boolean;
    passwordEnabled: Boolean,
    password?: string;
    token: string;
    memberIDs: number[];
};

@Injectable()
export class ChannelService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => LoginService))
    private readonly loginService: LoginService,
    private readonly messageService: MessageService,
    private readonly hashingService: HashingService,
    @Inject(forwardRef(() => ChannelMemberService))
    private readonly channelMemberService: ChannelMemberService,
    @Inject(forwardRef(() => GatewayService))
    private readonly gatewayService: GatewayService,
    private readonly userService: UserService,
    private readonly errorHandlingService: ErrorHandlingService,
  ) {}

  async getChannelByID(channelID: number, token: string): Promise<Channel> {
    try {
        this.loginService.getUserIDFromCache(token);
        const channel = await this.prisma.channel.findUnique({
          where: { ID: channelID },
        });
        if (!channel) throw new NotFoundException('Channel not found');
        return channel;
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }

  async getChannelWithMembersAndMessagesByID(channelID: number): Promise<ChannelWithMembersAndMessages> {
    try {
        const channel = await this.prisma.channel.findUnique({
            where: { ID: channelID },
            select: {
              ID: true,
              name: true,
              isPrivate: true,
              isDM: true,
              passwordEnabled: true,
              ownerID: true,
              members: { include: { user: { select: { ID: true, username: true } } } },
              messages: true,
            },
          });
      if (!channel) throw new NotFoundException('Channel not found');
      return channel;
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }
  

  addChannelMemberToChannel(channelID: number, socket: Socket): void {
    this.gatewayService.emitToRoom('updateChannelMember', String(channelID));
    if (socket?.connected) {
        socket.join(String(channelID));
    }
  }

  async joinChannel(channelID: number, socket: Socket, username: string): Promise<void> {
      this.addChannelMemberToChannel(channelID, socket);
      await this.messageService.sendActionLogMessage(channelID, username, 'join');
  }

  async assignNewOwner(channelID: number): Promise<void> {
    var channelMember = await this.prisma.channelMember.findFirst({
      where: {channelID: channelID, isAdmin: true, isBanned: false},
      select: {ID: true}
    })
    if (!channelMember) {
      channelMember = await this.prisma.channelMember.findFirst({
        where: {channelID: channelID, isBanned: false},
        select: {ID: true}
      })
    }
    if (channelMember) {
      await this.prisma.channelMember.update({
        where: {ID: channelMember.ID},
        data: {isOwner: true, isAdmin: true},
      })
    } else {
      await this.gatewayService.deleteChannel(channelID);
    }
  }

  async removeChannelMemberFromChannel(channelID: number, socket: Socket, token: string): Promise<void> {
    const userID = await this.loginService.getUserIDFromCache(token);
    const channelMember = await this.prisma.channelMember.findFirst({
      where: { userID: userID, channelID: channelID },
      select: { ID: true, isBanned: true, channelID: true, isOwner: true, user: { select: { username: true } } },
    });
    if (!channelMember) throw new NotFoundException('ChannelMember not found');
    if (!channelMember.isBanned) {
      await this.channelMemberService.deleteChannelMember(channelMember.ID);
      this.messageService.sendActionLogMessage(channelID, channelMember.user.username, 'leave');
    }
    if(channelMember.isOwner)
      await this.assignNewOwner(channelID);
    socket.leave(String(channelID));
    socket.emit('updateChannel');
    this.gatewayService.emitToRoom('updateChannelMember', String(channelID));
  }

  async emitNewPrivateChannel(channel: ChannelWithMembersAndMessages): Promise<void> {
    channel.members.map(async (member) => {
      const socket = await this.gatewayService.getWebSocketByUserID(member.userID);
      if (socket?.connected) {
        this.addChannelMemberToChannel(channel.ID, socket);
        socket.emit('updateChannel');
      }
    });
  }

  async emitNewChannel(server: Namespace, channel: ChannelWithMembersAndMessages): Promise<void> {
    if (channel.isPrivate) {
      await this.emitNewPrivateChannel(channel);
    }
    else server.emit('updateChannel');
  }

  async DMExists(ownerID: number, memberIDs: number[]): Promise<boolean> {
    try {
        const DMs = await this.prisma.channel.findMany({
          where: { isDM: true },
          select: { members: { select: { userID: true } } },
        });
        const DM = DMs.find((dm) => {
          const memberIDsInDM = dm.members.map((member) => member.userID);
          return memberIDsInDM.includes(ownerID) && memberIDsInDM.includes(memberIDs[0]);
        });
        return !!DM;
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async hasTooManyChannels(): Promise<boolean> {
    const channelCount = await this.prisma.channel.count();
    return channelCount > 20;
  }

  async newChannel(data: newChannelData): Promise<ChannelWithMembersAndMessages> {
    try {
        const ownerID = await this.loginService.getUserIDFromCache(data.token);
        if (this.hasTooManyChannels()) throw new ForbiddenException('Maximum number of channels reached. Try joining an existing channel.');
        if (data.isDM && (await this.DMExists(ownerID, data.memberIDs))) throw new ForbiddenException('DM already exists');
        const hashedPassword = data.password ? await this.hashingService.hashPassword(data.password) : null;
        const newChannel = await this.prisma.channel.create({
          data: {
            name: data.name,
            isPrivate: data.isPrivate,
            isDM: data.isDM,
            passwordEnabled: data.password? true : false,
            password: hashedPassword,
            ownerID: ownerID,
            members: {
              create: [
                { userID: ownerID, isOwner: true, isAdmin: true },
                ...data.memberIDs.map((memberID) => ({
                  userID: memberID,
                })),
              ],
            },
          },
          select: {
            ID: true,
            name: true,
            isPrivate: true,
            isDM: true,
            passwordEnabled: true,
            ownerID: true,
            members: { include: { user: { select: { ID: true, username: true } } } },
            messages: true,
          },
        });
        return newChannel;
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  getDMName(username: string, channel: ChannelWithMembers | ChannelWithMembersAndMessages): string {
    const channelMember = channel.members.find((member) => member.user.username !== username);
    if (!channelMember) throw new NotFoundException('Username not found')
    return channelMember.user.username;
  }

  async getPublicChannels(): Promise<ChannelResponse[]> {
    try {
        return await this.prisma.channel.findMany({
            where: { isPrivate: false },
            select: {
                ID: true,
                name: true,
                isPrivate: true,
                isDM: true,
                passwordEnabled: true,
                ownerID: true,
                members: { include: { user: { select: { ID: true, username: true } } } },
                messages: true,
            }
        });
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async getPrivateChannels(token: string): Promise<ChannelResponse[]> {
    try {
      const userID = await this.loginService.getUserIDFromCache(token);
      const user = await this.prisma.user.findUnique({
        where: { ID: userID },
        select: {
          username: true,
          channelMembers: {
            select: {
              isBanned: true,
              channel: { select: {
                  ID: true,
                  name: true,
                  isPrivate: true,
                  isDM: true,
                  passwordEnabled: true,
                  ownerID: true,
                  members: { include: { user: { select: { ID: true, username: true } } } },
                  messages: true,
              } },
            },
          },
        },
      });
      if (!user)
          throw new NotFoundException('User not found')
      return user.channelMembers
          .filter((channelMember) => !channelMember.isBanned && channelMember.channel.isPrivate)
          .map((channelMember) => {
          if (channelMember.channel.isDM)
              channelMember.channel.name = this.getDMName(user.username, channelMember.channel);
          return channelMember.channel;
      });
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async getChannelsOfUser(token: string): Promise<ChannelResponse[]> {
    const publicChannels = await this.getPublicChannels();
    const privateChannels = await this.getPrivateChannels(token);
    return [...publicChannels, ...privateChannels];
  }

  async newChannelMember(newMemberData: { channelID: number; memberID: number; token: string }): Promise<ChannelMember> {
    try {
        const existingChannelMember = await this.prisma.channelMember.findFirst({
          where: { channelID: newMemberData.channelID, userID: newMemberData.memberID },
        });
        if (existingChannelMember) throw new ForbiddenException('This user is already a member of the channel');
        const userID = await this.loginService.getUserIDFromCache(newMemberData.token);
        const channelMember = await this.prisma.channelMember.findFirst({
          where: {
            channelID: newMemberData.channelID,
            userID: userID,
          },
          select: { isAdmin: true },
        });
        if (!channelMember?.isAdmin) throw new ForbiddenException('You dont have Admin rights');
        const newMember = await this.channelMemberService.createChannelMember(newMemberData.memberID, newMemberData.channelID);
        await this.gatewayService.addSocketToRoom(newMemberData.memberID, newMemberData.channelID);
        return newMember;
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async getChannelMemberID(channelID: number, token: string): Promise<number> {
    try {
        const userID = await this.loginService.getUserIDFromCache(token);
        const channelMember = await this.prisma.channelMember.findFirst({
          where: {
            channelID: channelID,
            userID: userID,
          },
          select: { ID: true },
        });
        if (!channelMember) throw new NotFoundException('ChannelMember not found');
        return channelMember.ID;
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }

  async checkIsMuted(channelID: number, token: string) {
    try {
        const userID = await this.loginService.getUserIDFromCache(token);
        const channelMember = await this.prisma.channelMember.findFirst({
          where: {
            channelID: channelID,
            userID: userID,
          },
          select: {
            ID: true,
            isMuted: true,
            muteUntil: true,
          },
        });
        if (!channelMember) throw new NotFoundException('You are not a member of this channel.');
        if (channelMember.isMuted && channelMember.muteUntil && channelMember.muteUntil > new Date()) {
          const timeLeft = channelMember.muteUntil.getTime() - new Date().getTime();
          const secondsLeft = Math.floor(timeLeft / 1000);
          throw new ForbiddenException(`You are muted for ${secondsLeft} more seconds.`);
        }
        if (channelMember.isMuted && channelMember.muteUntil && channelMember.muteUntil <= new Date()) {
          await this.prisma.channelMember.update({
            where: { ID: channelMember.ID },
            data: { isMuted: false, muteUntil: null },
          });
        }
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }

  async updateChannel(userID) {
    const socket = await this.gatewayService.getWebSocketByUserID(userID);
    if (socket?.connected) socket.emit('updateChannel');
  }

  async isPrivateChannel(channelID: number): Promise<boolean> {
    try {
        const channel = await this.prisma.channel.findUnique({
          where: { ID: channelID },
          select: { isPrivate: true },
        });
        return channel?.isPrivate ? true : false;
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }

  async varifyPassword(channelID: number, password: string): Promise<boolean> {
    try {
      const channel = await this.prisma.channel.findUnique({
        where: {ID: channelID},
        select: {password: true},
      })
      if (!channel) throw new NotFoundException('Channel not found');
      return await this.hashingService.comparePassword(password, channel.password);
    } catch (error) {
      this.errorHandlingService.throwHttpException(error);
    }
  }

  async getDMInfo(channelID: number, token: string): Promise<UserProfile> {
    const userID = await this.loginService.getUserIDFromCache(token);
    const channel = await this.prisma.channel.findUnique({
      where: { ID: channelID },
      select: { members: { select: { user: { select: { ID: true } } } } },
    });
    if (!channel || !channel.members) {
      throw new NotFoundException("Channel not found or has no members");
    }
    const otherUser = channel.members.find(member => member.user.ID !== userID);
    if (!otherUser) {
      throw new Error("User not found");
    }
      return this.userService.getUserProfileByUserID(otherUser.user.ID, token);
  }

}
