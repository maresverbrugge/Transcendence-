export enum UserStatus {
  ONLINE,
  OFFLINE,
  IN_GAME,
  IN_CHAT,
}

export interface ChannelData {
  ID: number;
  name?: string;
  isPrivate: boolean;
  passwordEnabled: boolean;
  isDM: boolean;
}

export interface MemberData {
  ID: number;
  username: string;
  isOwner: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  user: { ID: number; username: string; status: string; };
  channelID: string;
}

export interface FriendData {
  ID: number;
  username: string;
  avatarURL: string;
  status : string;
}

export interface MessageData {
  ID: number;
  senderName?: string;
  senderID: number;
  channelID: number;
  content: string;
}

export interface UserData {
  ID: number;
  username: string;
  intraUsername: string;
  websocketID: string;
  Enabled2FA: boolean;
  status: string;
  avatarURL: string;
}
