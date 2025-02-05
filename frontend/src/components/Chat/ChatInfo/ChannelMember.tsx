import React from 'react';
import { Socket } from 'socket.io-client';

import { ChannelData, MemberData } from '../interfaces';
import BlockButton from './BlockButton';
import { emitter } from '../../emitter';
import { useNavigate } from 'react-router-dom';

interface ChannelMemberProps {
    member: MemberData;
    currentMember: MemberData;
    channel: ChannelData;
    blockedUserIDs: number[];
    socket: Socket;
}

const ChannelMember = ({member, currentMember, channel, blockedUserIDs, socket}: ChannelMemberProps) => {
  const token = localStorage.getItem('authenticationToken');
  const navigate = useNavigate();

  const confirmMessageMap: { [key: string]: string } = {
    demote: 'Are you sure you want to demote this admin?',
    makeAdmin: 'Are you sure you want to make this user an admin?',
    mute: 'Are you sure you want to mute this user?',
    kick: 'Are you sure you want to kick this user?',
    ban: 'Are you sure you want to ban this user?',
  };

  const emitAction = (action) => {
    socket.emit('channelAction', {
      action,
      channelMemberID: member.ID,
      token,
      channelID: channel.ID,
    });
  };

  const handleActionClick = (action: 'demote' | 'makeAdmin' | 'mute' | 'kick' | 'ban') => {
    emitter.emit('confirm', {
      message: confirmMessageMap[action],
      onOK: () => emitAction(action),
    });
  };

  const handleSendGameInvite = () => {
    socket.emit('sendGameInvite', { receiverUserID: member.user.ID, token });
    emitter.emit('sendGameInvite', member.user.ID)
  };

  const roleLabel = member.isOwner ? 'Owner' : member.isAdmin ? 'Admin' : '';

  return (
    <li className="p-1">
      <div className="dropdown">
        <button
          className="btn shadow btn-secondary dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          {(member.ID === currentMember.ID)
            ? `You${roleLabel ? ` (${roleLabel})` : ''}`
            : `${member.user.username}${roleLabel ? ` (${roleLabel})` : ''}`}
        </button>
        <ul
          className="dropdown-menu"
        >
          {currentMember?.isOwner && !member.isOwner && (
            <>
              {member.isAdmin ? (
                <li>
                  <button
                    className="dropdown-item text-primary-emphasis"
                    onClick={() => handleActionClick('demote')}
                  >
                    Demote Admin
                  </button>
                </li>
              ) : (
                <li>
                  <button
                    className="dropdown-item text-primary-emphasis"
                    onClick={() => handleActionClick('makeAdmin')}
                  >
                    Make Admin
                  </button>
                </li>
              )}
            </>
          )}
          {currentMember?.isAdmin && !member.isAdmin && (
            <>
              <li>
                <button
                  className="dropdown-item text-primary-emphasis"
                  onClick={() => handleActionClick('mute')}
                >
                  Mute
                </button>
              </li>
              <li>
                <button
                  className="dropdown-item text-primary-emphasis"
                  onClick={() => handleActionClick('kick')}
                >
                  Kick
                </button>
              </li>
              {!channel.isPrivate && (
                <li>
                  <button
                    className="dropdown-item text-primary-emphasis"
                    onClick={() => handleActionClick('ban')}
                  >
                    Ban
                  </button>
                </li>
              )}
            </>
          )}
          {currentMember.ID !== member.ID && (
            <>
              <li>
                <BlockButton userID={member?.user.ID} blockedUserIDs={blockedUserIDs} />
              </li>
              <li>
                <button
                  className="dropdown-item text-primary-emphasis"
                  onClick={handleSendGameInvite}
                >
                  Send Game Invite
                </button>
              </li>
            </>
          )}
          <li>
            <button
              className="dropdown-item text-primary-emphasis"
              onClick={() => navigate(`/profile/${member.user.ID}`)}
            >
              Go to Profile
            </button>
          </li>
        </ul>
      </div>

    </li>
  );
}

export default ChannelMember