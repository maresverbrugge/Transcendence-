import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Socket } from 'socket.io';
import { UserStatus } from '@prisma/client';
import { ChatGateway } from './chat.gateway';
import { ChannelService } from '../channel/channel.service';
import { LoginService } from 'src/authentication/login/login.service';
import { ChannelMemberService } from '../channel-member/channel-member.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ErrorHandlingService } from 'src/error-handling/error-handling.service';

@Injectable()
export class GatewayService {

    constructor(
        private prisma: PrismaService,
        private readonly errorHandlingService: ErrorHandlingService,
        @Inject(forwardRef(() => ChannelService))
        private readonly channelService: ChannelService,
        @Inject(forwardRef(() => LoginService))
        private readonly loginService: LoginService,
        @Inject(forwardRef(() => ChannelMemberService))
        private readonly channelMemberService: ChannelMemberService,
        @Inject(forwardRef(() => ChatGateway))
        private readonly chatGateway: ChatGateway,
    ) {}

    async handleConnection(client: Socket): Promise<void> {
        console.log(`Client connected: ${client.id}`);
        let token = client.handshake.query.token;
        if (Array.isArray(token)) token = token[0];
        const userID = await this.loginService.getUserIDFromCache(token);
        const user = await this.prisma.user.findUnique({where: {ID: userID}, select: {ID: true}});
        if (!user) {
          throw new NotFoundException('User not found')
        }
        await this.prisma.user.update({where: {ID: userID}, data: {status: UserStatus.IN_CHAT, websocketID: client.id}})
        this.updateUserStatus(userID, 'IN_CHAT');
        await this.channelMemberService.addSocketToAllRooms(client, userID);
    }

    async handleDisconnect(client: Socket): Promise<void> {
        console.log(`Client disconnected: ${client.id}`);
        const user = await this.prisma.user.findUnique({where: {websocketID: client.id}, select: {ID: true}});
        if (!user) {
            throw new NotFoundException('User not found')
        }
        await this.prisma.user.update({
            where: { ID: user.ID },
            data: { websocketID: null, status: UserStatus.ONLINE },
            select: {ID: true},
        });
        this.updateUserStatus(user.ID, 'ONLINE');
    }

    async addSocketToRoom(userID: number, channelID: number): Promise<void> {
        const socket = await this.getWebSocketByUserID(userID);
        const user = await this.prisma.user.findUnique({where: {ID: userID}, select: {username: true}});
        this.channelService.joinChannel(channelID, socket, user.username);
    }

    async getWebSocketByUserID(userID: number): Promise<Socket | null> {
        try {
          const user = await this.prisma.user.findUnique({ where: { ID: userID }, select: { websocketID: true } });
          if (!user) throw new NotFoundException('User not found');
          const server = this.chatGateway.getServer();
          const socket: Socket = server.sockets.get(user.websocketID);
          if (!socket?.connected) {
            return null;
          }
          return socket;
        } catch (error) {
          this.errorHandlingService.throwHttpException(error);
        }
    }

    emitToRoom(message: string, room: string, body?: any): void {
        const server = this.chatGateway.getServer();
        if (body) server.to(room).emit(message, body);
        else server.to(room).emit(message);
    }

    emitToSocket(message: string, socket: Socket, body?: any): void {
        if (socket?.connected) {
          if (body) socket.emit(message, body);
          else socket.emit(message);
        }
    }

    async deleteChannel(channelID: number): Promise<void> {
        await this.prisma.channel.delete({where: {ID: channelID}});
        const server = this.chatGateway.getServer();
        server.emit('updateChannel');
    }

    updateUserStatus(userID: number, status: ('ONLINE' | 'OFFLINE' | 'IN_GAME' | 'IN_CHAT')): void {
        const server = this.chatGateway.getServer();
        server.emit('userStatusChange', userID, status);
    }
}
