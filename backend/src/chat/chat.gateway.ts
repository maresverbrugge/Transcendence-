import {WebSocketServer, SubscribeMessage, MessageBody, WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket, Namespace } from 'socket.io';
import { UserService } from './user/user.service';
import { ChannelService } from './channel/channel.service'
import { MessageService } from './message/message.service'
import { ChannelMemberService } from './channel-member/channel-member.service';

@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: 'http://localhost:3000', // Update with your client's origin
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

export class ChatGateway 
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  
  @WebSocketServer() server: Namespace;

  constructor(
    private readonly channelService: ChannelService,
    private readonly userService: UserService,
    private readonly messageService: MessageService,
    private readonly channelMemberService: ChannelMemberService,
  ) {}
  
  // @SubscribeMessage('channelInvite')
  //   handleChannelInvite(client: Socket, memberID: number ) {
  //     this.channelService.sendChannelInvite(client, this.server, memberID)
  //   }

  // @SubscribeMessage('acceptChannelInvite')
  //   async handleAcceptChannelInvite(client: Socket, data: { ownerID: number, memberID: number , channelName: string}) {
  //     this.channelService.acceptChannelInvite(this.server, data.memberID, data.ownerID, data.channelName)
  //   }

  @SubscribeMessage('newChannel')
  async handleNewChannel(@MessageBody() data: {name: string, isPrivate: boolean, password?: string, ownerToken: string, memberIDs: number[] }) {
    this.channelService.newChannel(this.server, data)
  }

  @SubscribeMessage('joinChannel')
  async handleJoinChannel(client: Socket, data: { channelID: number, token:string }) {
    this.channelService.joinChannel(this.server, data.channelID, client.id, data.token)
  }

  @SubscribeMessage('leaveChannel')
  async handleLeaveChannel(client: Socket, data: { channelID: number, token:string }) {
    this.channelService.leaveChannelRemoveChannelMember(this.server, data.channelID, client.id, data.token)
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(client: Socket, data: { channelID: number, ownerToken: string, content: string }) {
    this.messageService.sendMessage(this.server, client, data)
  }

  @SubscribeMessage('channelAction')
  async handleChannelAction(@MessageBody() data: { action: string; channelMemberID: number; token: string; channelID: number }) {
  const { action, channelMemberID, token, channelID } = data;
  await this.channelMemberService.action(this.server, channelMemberID, token, channelID, action);
}

  afterInit(server: Namespace) {
    console.log('Chat Gateway Initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
    let token = client.handshake.query.token; // er komt een identifiyer via de token
    if (Array.isArray(token))
      token = token[0]; // Use the first element if token is an array
    const user = await this.userService.assignSocketAndTokenToUserOrCreateNewUser(client.id, token as string, this.server) // voor nu om de socket toe te wijzen aan een user zonder token
    this.server.emit('userStatusChange', user.id, 'ONLINE') //dit moet worden verplaats naar de plek waar je in en uitlogd, niet waar je connect met de Socket
    client.emit('token', client.id) //even socketID voor token vervangen tijdelijk
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const user = await this.userService.getUserBySocketID(client.id);
    await this.userService.removeWebsocketIDFromUser(client.id)
    if (user)
      this.server.emit('userStatusChange', user.id, 'OFFLINE') //dit moet worden verplaats naar de plek waar je in en uitlogd, niet waar je connect met de Socket
  }

}
