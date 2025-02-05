import { ForbiddenException, Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Namespace, Socket } from 'socket.io';
import { ChannelMember, User } from '@prisma/client';

import { ChannelService } from '../channel/channel.service';
import { MessageService } from '../message/message.service';
import { LoginService } from 'src/authentication/login/login.service';
import { ErrorHandlingService } from 'src/error-handling/error-handling.service';
import { GatewayService } from '../gateway/gateway.service';

type ChannelMemberResponse = ChannelMember & {
  user: Pick<User, 'ID' | 'username' | 'status' | 'websocketID'>;
};

type action = 'demote' | 'makeAdmin' | 'mute' | 'kick' | 'ban' | 'join' | 'leave';

@Injectable()
export class ChannelMemberService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => LoginService))
    private readonly loginService: LoginService,
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
    @Inject(forwardRef(() => ChannelService))
    private readonly channelService: ChannelService,
    private readonly errorHandlingService: ErrorHandlingService,
    @Inject(forwardRef(() => GatewayService))
    private readonly gatewayService: GatewayService,
  ) {}

  async getChannelMember(channelMemberID: number): Promise<ChannelMemberResponse> {
    try {
        const channelMember = await this.prisma.channelMember.findUnique({
          where: { ID: channelMemberID },
          include: {
            user: { select: { ID: true, websocketID: true, username: true, status: true } },
          },
        });
        if (!channelMember) throw new NotFoundException('Channel member not found');
        return channelMember;
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }

  async getChannelMembers(channelID: number, token: string): Promise<ChannelMemberResponse[]> {
    try {
        if (!(await this.isChannelMember(channelID, token))) {
          throw new ForbiddenException('You are not a member of this channel');
        }
        const channel = await this.prisma.channel.findUnique({
          where: { ID: channelID },
          include: {
            members: {
              include: {
                user: { select: { ID: true, username: true, status: true, websocketID: true } },
              },
            },
          },
        });
        if (!channel) throw new NotFoundException('Channel not found');
        const filteredMembers = channel.members.filter((member) => !member.isBanned && member.channelID === channelID);
        return filteredMembers;
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }

  async isChannelMember(channelID: number, token: string): Promise<boolean> {
    try {
      const userID = await this.loginService.getUserIDFromCache(token);
      const user = await this.prisma.user.findUnique({
        where: { ID: userID },
        include: { channelMembers: { select: { channelID: true, isBanned: true } } },
      });
      if (!user)
        throw new NotFoundException('User not found')
      const member = user?.channelMembers.find((member) => member.channelID === channelID);
      return member !== undefined && !member.isBanned;
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }

  async getChannelMemberByToken(token: string, channelID: number): Promise<ChannelMemberResponse> {
    try {
        const userID = await this.loginService.getUserIDFromCache(token);
        const channelMember = await this.prisma.channelMember.findFirst({
          where: {
            userID: userID,
            channelID: channelID,
          },
          include: {
            user: { select: { ID: true, websocketID: true, username: true, status: true } },
          },
        });
        if (!channelMember) throw new NotFoundException('ChannelMember not found');
        return channelMember;
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }

  async addChannelMemberIfNotExists(channelID: number, token: string): Promise<ChannelMember> {
    try {
      const channelMember = await this.getChannelMemberByToken(token, channelID);
      await this.checkBanOrKick(channelMember, channelID);
      return channelMember;
    } catch (error) {
      if (error instanceof NotFoundException) {
        const userID = await this.loginService.getUserIDFromCache(token);
        return this.createChannelMember(userID, channelID);
      } else throw error;
    }
  }

  async createChannelMember(userID: number, channelID: number): Promise<ChannelMember> {
    try {
      return await this.prisma.channelMember.create({
        data: {
          userID: userID,
          channelID: channelID,
        },
      });
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }

  async deleteChannelMember(channelMemberID: number): Promise<ChannelMember> {
    try {
      return await this.prisma.channelMember.delete({
        where: { ID: channelMemberID },
      });
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }

  async isAdmin(token: string, channelID: number): Promise<boolean> {
    const channelMember = await this.getChannelMemberByToken(token, channelID);
    return channelMember.isAdmin;
  }

  async isOwner(token: string, channelID: number): Promise<boolean> {
    const channelMember = await this.getChannelMemberByToken(token, channelID);
    return channelMember.isOwner;
  }

  async updateChannelMember(memberID: number, updateData: any): Promise<ChannelMemberResponse> {
    try {
        return await this.prisma.channelMember.update({
          where: { ID: memberID },
          data: updateData,
          include: {
            user: { select: { ID: true, websocketID: true, username: true, status: true } },
          },
        });
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }

  async checkBanOrKick(channelMember: ChannelMemberResponse, channelID: number): Promise<void> {
    if (!channelMember.isBanned) return;
    if (!channelMember.banUntil) throw new ForbiddenException('You are banned from this channel');
    else {
      const timeLeft = channelMember.banUntil.getTime() - new Date().getTime();
      if (timeLeft > 0) {
        const secondsLeft = Math.floor(timeLeft / 1000);
        throw new ForbiddenException(`You are kicked from this channel. Try again in ${secondsLeft} seconds.`);
      } else {
        await this.updateChannelMember(channelMember.ID, { isBanned: false, banUntil: null });
        this.gatewayService.emitToRoom('updateChannelMember', String(channelID));
      }
    }
  }

  async checkPermissions(
    token: string,
    channelID: number,
    targetIsAdmin: boolean,
    requiredRole: 'owner' | 'admin',
    action: action
  ): Promise<void> {
    const isAllowed =
      requiredRole === 'owner' ? await this.isOwner(token, channelID) : await this.isAdmin(token, channelID);
    if (!isAllowed) throw new ForbiddenException(`You don't have ${requiredRole} permissions`);
    if (action === 'ban' || action === 'kick' || action === 'mute') {
      if (targetIsAdmin) throw new ForbiddenException(`You can't ${action} another admin`);
    }
  }

  actionGetUpdateData(action: action): any {
    switch (action) {
      case 'ban':
        return { isBanned: true };
      case 'mute': {
        const muteUntil = new Date(Date.now() + 60 * 1000);
        return { isMuted: true, muteUntil };
      }
      case 'kick': {
        const banUntil = new Date(Date.now() + 120 * 1000);
        return { isBanned: true, banUntil };
      }
      case 'makeAdmin':
        return { isAdmin: true };
      case 'demote':
        return { isAdmin: false };
      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }

  async action(
    server: Namespace,
    channelMemberID: number,
    token: string,
    channelID: number,
    action: 'demote' | 'makeAdmin' | 'mute' | 'kick' | 'ban' | 'join' | 'leave'
  ): Promise<void> {
    const targetChannelMember = await this.getChannelMember(channelMemberID);
    await this.checkPermissions(token, channelID, targetChannelMember.isAdmin, 'admin', action);
    const updateData = this.actionGetUpdateData(action);
    this.messageService.sendActionLogMessage(channelID, targetChannelMember.user.username, action);
    await this.updateChannelMember(channelMemberID, updateData);
    if (action === 'ban' || action === 'kick') {
      if (await this.channelService.isPrivateChannel(channelID)) {
        await this.deleteChannelMember(targetChannelMember.ID);
      }
      const socket = server.sockets.get(targetChannelMember.user.websocketID);
      if (socket) {
        socket.leave(String(channelID));
        socket.emit('deselectChannel');
        socket.emit('updateChannel');
      }
    }
    this.gatewayService.emitToRoom('updateChannelMember', String(channelID));
  }

  async addSocketToAllRooms(socket: Socket, userID: number): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { ID: userID },
        select: { channelMembers: { select: { channelID: true, isBanned: true } } },
      });
      if (!user) throw new NotFoundException('User not found');
      const channelMembers = user.channelMembers;
      channelMembers.map((member) => {
        if (!member.isBanned) {
          socket.join(String(member.channelID));
        }
      });
    } catch (error) {
        this.errorHandlingService.throwHttpException(error);
    }
  }
}
