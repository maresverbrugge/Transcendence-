import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { LoginModule } from './login/login.module';
import { UserModule } from './user/user.module';
// import { ChatGateway } from './chat/chat.gateway';
// import { ChannelService } from './chat/channel/channel.service';
// import { MessageService } from './chat/message/message.service';
// import { ChatModule } from './chat/chat.module';
import { ChatGateway } from './chat/chat.gateway';
import { ChannelService } from './chat/channel/channel.service';
import { UserService } from './chat/user/user.service';
import { MessageService } from './chat/message/message.service';
import { ChatModule } from './chat/chat.module';
import { GameGateway } from './game/game.gateway';
import { GameController } from './game/game.controller';
import { ChannelMemberService } from './chat/channel-member/channel-member.service';

@Module({
  imports: [PrismaModule, LoginModule, ChatModule, UserModule],
  providers: [PrismaService, ChatGateway, ChannelService, UserService, MessageService, GameGateway, ChannelMemberService],
  exports: [PrismaService],
  controllers: [GameController],
})
export class AppModule {}
