import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameService } from './game.service';
import { LoginService } from 'src/authentication/login/login.service';
import { GameController } from './game.controller';
import { MatchmakingGateway } from 'src/matchmaking/matchmaking.gateway';
import { GameGateway } from './game.gateway';
import { UserModule } from 'src/user/user.module';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  controllers: [GameController],
  providers: [PrismaService, LoginService, GameService, GameGateway, MatchmakingGateway],
  exports: [],
  imports: [UserModule, ChatModule]
})
export class GameModule {}