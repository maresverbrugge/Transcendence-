import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import axios from 'axios';

import { ChannelData, MemberData, FriendData } from '../interfaces';
import AddMember from '../AddChannelMember';
import ChannelMember from './ChannelMember';
import { emitter } from '../../emitter';

interface ChannelMemberListProps {
  channel: ChannelData;
  friends: FriendData[];
  socket: Socket;
}

const ChannelMemberList = ({ channel, friends, socket }: ChannelMemberListProps) => {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [currentMemberID, setCurrentMemberID] = useState<number | null>(null);
  const [blockedUserIDs, setBlockedUserIDs] = useState<number[]>([]);
  const token = localStorage.getItem('authenticationToken');

  useEffect(() => {
    const fetchCurrentMemberID = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_URL_BACKEND}/chat/channel/memberID/${channel.ID}/${token}`);
        setCurrentMemberID(parseInt(response.data));
      } catch (error) {
        emitter.emit('error', error);
      }
    };

    const fetchChannelMembers = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_URL_BACKEND}/chat/channel/members/${channel.ID}/${token}`);
            setMembers(response.data);
        } catch (error) {
            emitter.emit('error', error);
        }
    };

    const fetchBlockedUserIDs = async () => {
      try {
        const response = await axios.get<number[]>(`${process.env.REACT_APP_URL_BACKEND}/chat/blockedUser/IDs/${token}`);
        setBlockedUserIDs(response.data);
      } catch (error) {
        emitter.emit('error', error);
    }
    };

    fetchCurrentMemberID();
    fetchChannelMembers();
    fetchBlockedUserIDs();

    socket.on('updateChannelMember', () => fetchChannelMembers());

    return () => {
      socket.off('updateChannelMember');
    };
  }, [channel, socket]);

  const currentMember = members.find((member) => member.ID === currentMemberID);
  if (currentMember?.isBanned) emitter.emit('selectChannel', null);

  const sortedMembers = members.sort((a, b) => {
    if (a.isOwner) return -1;
    if (b.isOwner) return 1;
    if (a.isAdmin && !b.isAdmin) return -1;
    if (b.isAdmin && !a.isAdmin) return 1;
    return 0;
  });

  return (
    <div className='p-0 pb-2' style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ul style={{ listStyleType: 'none', paddingLeft: 0, flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', maxWidth: '100%', boxSizing: 'border-box'}}>
        {sortedMembers.map((member) => {
          if (member.isBanned) return null;
          return (
            <ChannelMember key={`member${member.ID}`} member={member} currentMember={currentMember} channel={channel} blockedUserIDs={blockedUserIDs} socket={socket}/>
          );
        })}
      </ul>
      {currentMember?.isAdmin && channel.isPrivate && (
        <button
          type="button"
          className="btn btn-success"
          style={{ marginTop: 'auto' }}
          onClick={() => emitter.emit('addChannelMember', channel.ID)}
        >
          Add Member
        </button>
      )}
    </div>
  );
};

export default ChannelMemberList;
