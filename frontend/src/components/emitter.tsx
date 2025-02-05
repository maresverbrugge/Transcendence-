import mitt from 'mitt';

type Events = {
  selectChannel: number;
  error: any;
  alert: string;
  acceptOtherGameInvite: void;
  createChannel: void;
  showPasswordPrompt: number;
  confirm: { message: string; onOK: () => void };
  sendGameInvite: number;
  addChannelMember: number;
};

export const emitter = mitt<Events>();