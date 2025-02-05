import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { FriendData } from '../interfaces';

import { useNavigate } from 'react-router-dom';

interface FriendProps {
  key: number;
  friend: FriendData;
  socket: Socket;
}

interface FriendsProps {
  friends: FriendData[];
  socket: Socket;
}

const Friend = ({ friend, socket }: FriendProps) => {
  const [statusColor, setStatusColor] = useState('bg-danger')
  const navigate = useNavigate();

  useEffect(() => {

    const getStatusColor = (userstatus: string) => {
      switch (userstatus) {
        case 'ONLINE':
          return 'warning';
        case 'IN_CHAT':
          return 'success';
        case 'IN_GAME':
          return 'warning';
        case 'OFFLINE':
          return 'danger';
        default:
          return 'secondary';
      }
    };

    socket.on('userStatusChange', (userID, userStatus) => {
      if (userID === friend.ID) {
        setStatusColor(getStatusColor(userStatus));
      }
    });

    setStatusColor(getStatusColor(friend.status));

    return () => {
      socket.off('userStatusChange');
    };
  }, [friend, socket]);

  return (
    <li key={friend.ID} className="list-item">
      <div className="d-flex align-items-center">
        <img
          src={friend.avatarURL}
          alt={`${friend.username}'s avatar`}
          className="rounded-circle"
          style={{
            width: '3rem',
            height: '3rem',
            objectFit: 'cover',
          }}
        />
          <button
            onClick={() => navigate(`/profile/${friend.ID}`)}
            className={`btn bg-${statusColor} p-1 m-2 mt-0 mb-0`}
            style={{ textDecoration: 'none', width: '70%', overflow: 'hidden', textOverflow: 'ellipsis'}}>
            {friend.username}
          </button>
      </div>
    </li>
  );
};

const Friends = ({ friends, socket }: FriendsProps) => {
  const token = localStorage.getItem('authenticationToken');

  return (
    <>
      <div className="mb-3 text-center">
        <h2>Friends</h2>
      </div>
      <div style={{ flexGrow: 1, overflowY: 'auto'}}>
        <ul className="friends" style={{ paddingLeft: 0}}>
          {friends
            .sort((a, b) => {
              const statusOrder = { IN_CHAT: 1, ONLINE: 2, IN_GAME: 2, OFFLINE: 3 };
              return statusOrder[a.status] - statusOrder[b.status];
            })
            .map((friend) => (
              <Friend key={friend.ID} friend={friend} socket={socket} />
            ))
          }
        </ul>
      </div>
    </>
  );
};

export default Friends;
