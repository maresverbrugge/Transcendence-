import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import Channels from '../components/Chat/Channels/Channels';
import ChatInfo from '../components/Chat/ChatInfo/ChatInfo';
import Messenger from '../components/Chat/Messenger/Messenger';
import { MemberData } from '../components/Chat/interfaces';
import axios from 'axios';
import { emitter } from '../components/emitter';
import ReceiveGameInvite from '../components/Chat/ChatInfo/ReceiveGameInvite';
import GoBackButton from '../components/GoBackButton';
import NewChannel from '../components/Chat/Channels/NewChannel';

const Chat = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [channelID, setChannelID] = useState<number | null>(null);
  const [friends, setFriends] = useState<MemberData[]>([]);
  const token = localStorage.getItem('authenticationToken');

  useEffect(() => {


      
    const socketIo = io(`${process.env.REACT_APP_URL_BACKEND_WS}/chat`, {
      transports: ["websocket"],
      query: { token },
      withCredentials: true,
    });
    
    socketIo.on('connect', () => {
      console.log('Connected to the server.');
    });

    socketIo.on('connect_error', (error: any) => {
      console.error('Connection Error:', error.message);
    });

    socketIo.on('error', (error) => {emitter.emit('error', error)});

    socketIo.on('deselectChannel', () => {
      selectChannel(null)
    })

    emitter.on('selectChannel', selectChannel);

    setSocket(socketIo);

    return () => {
      emitter.off('selectChannel');
      socketIo.disconnect();
    };
  }, []);

  const selectChannel = async (newChannelID: number | null) => {
    if (newChannelID === null) {
      setChannelID(null);
      return;
    }
    try {
      await axios.post(`${process.env.REACT_APP_URL_BACKEND}/chat/channel/${newChannelID}/add-member`, { token: token} )
      setChannelID(newChannelID);
    } catch (error) {
      emitter.emit('error', error);
    }
  };

  if (!socket) return <p>Loading...</p>;

  return (
    <div className="container my-5 h-100">
      {/* Overlays */}
      <NewChannel friends={friends} socket={socket}/>
      <GoBackButton />
      <ReceiveGameInvite socket={socket} />
    <div className="row g-4" style={{ height: '90%' }}>

    {/* Left Column */}
        <Channels selectedChannelID={channelID} socket={socket} />
  
        {/* Middle Column */}
        <div className="col-md-6">
          <div className="card shadow">
            <div
              className="card-body p-2"
              style={{
                minHeight: '150px', // Start small when empty
                maxHeight: '100vh',  // Stop growing beyond this point
                overflowY: 'auto',  // Enable scrolling if needed
                paddingRight: '5px', // Optional: Avoid cutoff
                paddingLeft: '5px',
              }}
            >
              <Messenger channelID={channelID} socket={socket} />
            </div>
          </div>
        </div>
  
        {/* Right Column */}
        <div className="col-md-3">
          <div className="card shadow h-100">
            <div className="card-body p-2">
              <ChatInfo
                channelID={channelID}
                friends={friends}
                setFriends={setFriends}
                socket={socket}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );  
};

export default Chat;
