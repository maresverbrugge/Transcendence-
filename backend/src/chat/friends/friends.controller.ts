import { Controller, Get, Param, NotFoundException, HttpException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';

@Controller('chat/friends')
export class FriendsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':token')
  async getFriendList(@Param('token') token: string): Promise<User[]> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { websocketID: token }, //later veranderen naar token
        include: { friends: true },
      });
      if (!user) throw new NotFoundException('User not found');
      return user.friends;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException('An unexpected error occurred', error.message);
    }
  }
}
