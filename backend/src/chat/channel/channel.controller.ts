import { Controller, Get, Post, Body, Param, ParseIntPipe, ForbiddenException, HttpCode } from '@nestjs/common';
import { User, Message, ChannelMember, UserStatus } from '@prisma/client';

import { ChannelService } from './channel.service';
import { ChannelMemberService } from '../channel-member/channel-member.service';
import { ChannelPasswordPipe } from '../pipes/channel-password.pipe';
import { ChannelNamePipe } from '../pipes/channel-name.pipe';

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

type ChannelMemberResponse = ChannelMember & {
  user: Pick<User, 'ID' | 'username' | 'status' | 'websocketID'>;
};

type newChannelData = {
  name: string;
  isPrivate: boolean;
  isDM: boolean;
  passwordEnabled: boolean;
  password?: string;
  token: string;
  memberIDs: number[];
};

type UserProfile = {
  currentUserID: number;
  profileID: number;
  username: string;
  avatarURL: string;
  status: UserStatus;
}

type newMemberData = {
  channelID: number;
  memberID: number;
  token: string
}

@Controller('chat/channel')
export class ChannelController {
  constructor(
    private readonly channelService: ChannelService,
    private readonly channelMemberService: ChannelMemberService
  ) {}

  @Post()
  async newChannel(@Body() body: { newChannelData: newChannelData }): Promise<ChannelWithMembersAndMessages> {
    const channelNamePipe = new ChannelNamePipe();
    channelNamePipe.transform(body.newChannelData.name);
    if (body.newChannelData.password) {
      const channelPasswordPipe = new ChannelPasswordPipe();
      channelPasswordPipe.transform(body.newChannelData.password);
    }
    return this.channelService.newChannel(body.newChannelData);
  }

  @Post('/newMember')
  async newMember(@Body() body: { newMemberData: newMemberData }): Promise<ChannelMember> {
    return this.channelService.newChannelMember(body.newMemberData);
  }

  @Get('/all/:token')
  async getChannels(@Param('token') token: string): Promise<ChannelResponse[]> {
    return this.channelService.getChannelsOfUser(token);
  }
  
  @Post('/:channelID/add-member')
  async addChannelMember(
    @Param('channelID', ParseIntPipe) channelID: number,
    @Body('token') token: string,
  ): Promise<ChannelMember> {
    return this.channelMemberService.addChannelMemberIfNotExists(channelID, token);
  }

  @Get('/:channelID/:token')
  async getChannel(@Param('channelID', ParseIntPipe) channelID: number, @Param('token') token: string): Promise<ChannelResponse> {
    return this.channelService.getChannelByID(channelID, token);
  }

  @Get('/memberID/:channelID/:token')
  async getChannelMemberID(@Param('channelID', ParseIntPipe) channelID: number, @Param('token') token: string): Promise<number> {
    return this.channelService.getChannelMemberID(channelID, token);
  }

  @Get('/members/:channelID/:token')
  async getChannelMembers(@Param('channelID', ParseIntPipe) channelID: number, @Param('token') token: string): Promise<ChannelMemberResponse[]> {
    return this.channelMemberService.getChannelMembers(channelID, token);
  }

  @Get('/dm-info/:channelID/:token')
  async getDMInfo(@Param('channelID', ParseIntPipe) channelID: number, @Param('token') token: string): Promise<UserProfile> {
    return this.channelService.getDMInfo(channelID, token);
  }

  @Post('/:channelID/verify-password')
  @HttpCode(200)
  async varifyPassword(
    @Param('channelID', ParseIntPipe) channelID: number,
    @Body('password') password: string ){
    const isValid = await this.channelService.varifyPassword(channelID, password);
    if (! isValid) throw new ForbiddenException('Incorrect password');
    
    return {
      message: 'Password is correct',
      status: 'success',
    };
  }
}
