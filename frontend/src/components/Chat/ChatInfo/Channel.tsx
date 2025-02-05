import React, { useEffect } from 'react';
import { Socket } from 'socket.io-client';

import ChannelMemberList from './ChannelMemberList';
import { ChannelData, FriendData } from '../interfaces';
import { emitter } from '../../emitter';

interface ChannelProps {
  channel: ChannelData;
  friends: FriendData[];
  socket: Socket;
}

const Channel = ({ channel, friends, socket }: ChannelProps) => {
  const token = localStorage.getItem('authenticationToken');

  useEffect(() => {
    const handleDisconnect = () => {
      if (channel && !channel.isPrivate) {
        socket.emit('leaveChannel', { channelID: channel.ID, token });
      }
    };

    if (channel && !channel.isPrivate) {
      socket.emit('joinChannel', { channelID: channel.ID, token });
    }

    socket.on('disconnect', handleDisconnect);

    const handleBeforeUnload = () => {
      handleDisconnect();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (channel && !channel.isPrivate) {
        socket.emit('leaveChannel', { channelID: channel.ID, token});
      }
      socket.off('disconnect', handleDisconnect);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [channel, socket]);

  const leaveChannel = () => {
    socket.emit('leaveChannel', { channelID: channel.ID, token});
    emitter.emit('selectChannel', null);
  };

  return (
    <>
      <div className="mb-3 text-center">
        <h2>{(channel?.name) ? channel.name : `Channel ${channel?.ID}`}</h2>
      </div >
      <ChannelMemberList
        channel={channel}
        friends={friends}
        socket={socket}
      />
      {channel.isPrivate && <button type="button" className="btn btn-outline-warning" style={{ marginTop: 'auto' }} onClick={leaveChannel}>Leave Channel</button>}

    </>
  );
};

export default Channel;
