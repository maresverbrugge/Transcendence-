import { Module, forwardRef } from '@nestjs/common';

import { ChannelController } from './channel/channel.controller';
import { ChannelService } from './channel/channel.service';
import { UserController } from './blockedUser/blockedUser.controller';
import { ChannelMemberService } from './channel-member/channel-member.service';
import { MessageService } from './message/message.service';
import { MessageController } from './message/message.controller';
import { BlockedUserService } from './blockedUser/blockedUser.service';
import { HashingService } from './hashing/hashing.service';
import { GameInviteService } from './gameInvite/game-invite.service';
import { ErrorHandlingService } from 'src/error-handling/error-handling.service';
import { GatewayService } from './gateway/gateway.service';
import { UserModule } from 'src/user/user.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LoginModule } from 'src/authentication/authentication.module';
import { ChatGateway } from './gateway/chat.gateway';

@Module({
  controllers: [ChannelController, UserController, MessageController],
  providers: [
    ChannelService,
    ChannelMemberService,
    MessageService,
    GatewayService,
    ChatGateway,
    BlockedUserService,
    HashingService,
    GameInviteService,
    ErrorHandlingService,
  ],
  exports: [GatewayService],
  imports: [
    PrismaModule,
    forwardRef(() => UserModule),
    forwardRef(() => LoginModule),
  ],
})
export class ChatModule {}
