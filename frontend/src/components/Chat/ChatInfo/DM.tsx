import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';

interface DMProps {
  channelID: number;
  socket: Socket;
}

interface DMInfo {
  avatarURL: string;
  currentUserID: number;
  profileID: number;
  status: string;
  username: string
}

interface DMInfoComponentProps {
  profileID: number;
  username: string;
  status: string;
  avatarURL: string;
  socket: Socket;
}

const DMInfoComponent = ({ profileID, username, status, avatarURL, socket }: DMInfoComponentProps) => {
  const navigate = useNavigate();
  const [statusColor, setStatusColor] = useState('bg-danger');
  const [displayStatus, setDisplayStatus] = useState('Offline');

  useEffect(() => {

    const getStatusColor = (userstatus: string) => {
      switch (userstatus) {
        case 'ONLINE':
          return 'bg-warning';
        case 'IN_CHAT':
          return 'bg-success';
        case 'IN_GAME':
          return 'bg-warning';
        case 'OFFLINE':
          return 'bg-danger';
        default:
          return 'bg-secondary';
      }
    };
  
    const getDisplayStatus = (userstatus: string) => {
      switch (userstatus) {
        case 'IN_CHAT':
          return 'Online';
        case 'OFFLINE':
          return 'Offline';
        case 'IN_GAME':
        case 'ONLINE':
          return 'Away';
        default:
          return 'Unknown';
      }
    };

    socket.on('userStatusChange', (userID, userStatus) => {
      if (userID === profileID) {
        setStatusColor(getStatusColor(userStatus));
        setDisplayStatus(getDisplayStatus(userStatus));
      }
    });

    setStatusColor(getStatusColor(status));
    setDisplayStatus(getDisplayStatus(status));

    return () => {
      socket.off('userStatusChange');
    };
  }, [profileID, status, socket]);

  return (
    <div className="dm-info d-flex flex-column align-items-center" style={{ padding: '1rem', gap: '1rem' }}>
      <img
        src={avatarURL}
        alt={`${username}'s avatar`}
        className="rounded-circle"
        style={{
          width: '16vw',
          height: '16vw',
          maxWidth: '10rem',
          maxHeight: '10rem',
          objectFit: 'cover',
        }}
      />
      <button
        onClick={() => navigate(`/profile/${profileID}`)}
        className="btn btn-link p-0"
        style={{
          textDecoration: 'none',
          fontSize: '2rem',
          fontWeight: 'bold',
          textAlign: 'center',
        }}
      >
        {username}
      </button>
      <span
        className={`badge ${statusColor}`}
        style={{
          fontSize: '1.8rem',
          padding: '0.6rem 1.2rem',
          textTransform: 'capitalize',
        }}
      >
        {displayStatus}
      </span>
    </div>
  );
};


const DM = ({ channelID, socket }: DMProps) => {
  const [DMInfo, setDMInfo] = useState<DMInfo | null>(null);

  useEffect(() => {
    const fetchDMInfo = async (channelID: number) => {
      try {
        const token = localStorage.getItem('authenticationToken');
        const response = await axios.get(
          `${process.env.REACT_APP_URL_BACKEND}/chat/channel/dm-info/${channelID}/${token}`
        );
        setDMInfo(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchDMInfo(channelID);
  }, [channelID]);

  return (
    <div className="dm-container">
      {DMInfo ? (
        <DMInfoComponent
          profileID={DMInfo.profileID}
          username={DMInfo.username}
          status={DMInfo.status}
          avatarURL={DMInfo.avatarURL}
          socket={socket}
        />
      ) : (
        <h1>Loading...</h1>
      )}
    </div>
  );
};

export default DM;
