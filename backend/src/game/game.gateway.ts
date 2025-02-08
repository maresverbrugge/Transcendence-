import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Namespace } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { UserStatus, MatchStatus } from '@prisma/client';
import { GameService } from './game.service';
import { LoginService } from 'src/authentication/login/login.service';

@WebSocketGateway({
  namespace: 'game',
  cors: {
    origin: `${process.env.URL_FRONTEND}`, // Update with your client's origin
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private prisma: PrismaService,
    private readonly userService: UserService,
    private readonly gameService: GameService,
	private readonly loginService: LoginService
  ) {}

  @WebSocketServer() server: Namespace;
  private logger: Logger = new Logger('GameGateway');

  @SubscribeMessage('getGameID')
  async handleGetGameID(client: Socket, token: string) {
	try {
		const memberID: number = await this.loginService.getUserIDFromCache(token);
		const gameID: number = this.gameService.getGameID(memberID);
		client.emit('gameID', gameID);
		const side: number = await this.gameService.getSide(gameID, token);
		client.emit('side', side);
	} catch (error) {
		console.error('I was not able to find the game associated with this user, sorry about that');
		console.error(error);
		client.emit('error');
	}
  }

  @SubscribeMessage('start')
  handleGameStart(client: Socket, payload: { token: string; gameID: number }) {
	const { token, gameID } = payload;
    this.gameService.handleStart(gameID, token, this.server);
  }

  @SubscribeMessage('reconnected')
  handleReconnection(client: Socket, gameID: number) {
    // this.gameService.handleReconnection(gameID, this.server);
  }

  @SubscribeMessage('key')
  async handleKey(client: Socket, payload: {move: string; gameID: number; token: string }) {
	const { move, gameID, token } = payload;
    this.gameService.handleKey(this.server, move, token, gameID);
  }

  @SubscribeMessage('left scored')
  async handleScoreLeft(client: Socket, gameID: number) {
    this.gameService.handleScoreLeft(gameID);
  }

  @SubscribeMessage('right scored')
  async handleScoreRight(client: Socket, gameID: number) {
    this.gameService.handleScoreRight(gameID);
  }

  @SubscribeMessage('hit paddle')
  async handleHitPaddle(client: Socket, gameID: number, value: number, oldHigh: number) {
	const speedY: number = this.gameService.handleHitPaddle(gameID, value, oldHigh);
    this.server.emit('ballSpeedY', speedY);
	this.gameService.handleReverseSpeedX(gameID);
  }

  @SubscribeMessage('reverse ball speedY')
  async handleReverseSpeedY(client: Socket, gameID: number) {
	  const speedY: number = this.gameService.handleReverseSpeedY(gameID);
    client.emit('ballSpeedY', speedY);
  }

  @SubscribeMessage('done')
  handleGameEnd(client: Socket, gameID: number) {
	this.gameService.handleEnd(gameID, client);
  }

  afterInit(server: Namespace) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
	console.log(`Client connected: ${client.id}`);
      let token = client.handshake.query.token;
      if (Array.isArray(token)) token = token[0];
      const userID = await this.loginService.getUserIDFromCache(token);
      await this.prisma.user.update({where: {ID: userID}, data: {status: UserStatus.IN_GAME, websocketID: client.id}})
	//   await this.gameService.updateSocket(token, client.id);
    } catch (error) {
    //   if (!(error instanceof HttpException)) error = new InternalServerErrorException('An unexpected error occurred', error.message);
      console.error(error)
      client.emit('error', error)
    }
  }
  async handleDisconnect(client: Socket): Promise<void> {
    try {
		//check if other player disconnected
		let token = client.handshake.query.token;
        if (Array.isArray(token)) token = token[0];
        const userID = await this.loginService.getUserIDFromCache(token);
		const user = await this.prisma.user.findUnique({
			where: {
				ID: userID,
			},
			select: {
				matches: {
					select: {
						status: true,
						players: {
							select: {
								websocketID: true,
							}
						}
					}
				}
			}
		});
		const game = user.matches.filter(x => x.status == MatchStatus.PENDING)[0];
		// for (client in game.players)
		// {
		// 	if (client.websocketID != playerID)
		// 		this.server.to(client.websocketID).emit('pause');
		// }
		console.log(`Client disconnected: ${client.id}`);
		await this.prisma.user.update({
        where: { ID: userID },
        data: { websocketID: null, status: UserStatus.ONLINE },
      });
    } catch (error) {
    //   if (!(error instanceof HttpException)) error = new InternalServerErrorException('An unexpected error occurred', error.message);
      console.error(error)
      client.emit('error', error)
    }
  }
}
