import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { emitter } from '../emitter';
import Accept from './Accept';

interface ReceiveGameInviteProps {
    socket: Socket;
  }

const ReceiveGameInvite = ({ socket }: ReceiveGameInviteProps) => {
  const [invite, setInvite] = useState<{senderUsername: string , senderUserID: number} | null>(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('authenticationToken');
  
  useEffect(() => {
    
    socket.on('gameInvite', (data: {senderUsername: string , senderUserID: number}) => {
      if (!invite) {
        setInvite(data);
      } else {
        socket.emit('declineGameInvite', {
          senderUserID: data.senderUserID,
          message: 'The player you invited for a game of Pong is currently busy with another invitation. Please try again later!',
          token
        })
      }
    })

    socket.on('cancelGameInvite', (data: {senderUserID: number}) => {
      if ( invite?.senderUserID === data.senderUserID) {
        setInvite(null);
        emitter.emit('alert', 'The other player has cancelled the game invitation.');
      }
    });
    
    socket.on('gameCreated', handleGameCreated);
    
    return () => {
      socket.off('gameInvite');
      socket.off('cancelGameInvite');
    };
  }, [invite, socket]);
  
  const handleGameCreated = (data: {created: boolean, senderID: number}) => {
    if (invite.senderUserID === data.senderID) {
      if (data.created) {
        navigate('/game');
      } else {
        emitter.emit('alert', 'An error occurred while starting the game. Please try again.')
      }
    }
  }

  const handleAcceptGameInvite = (senderUserID: number) => {
    setInvite(null);
    emitter.emit('acceptOtherGameInvite'); //for if an outgoing game invite is pending
    socket.emit('acceptGameInvite', {senderUserID, token});
    emitter.emit('alert', 'waiting for the game to start...')
  }

  const handleDeclineGameInvite = (senderUserID: number) => {
    socket.emit('declineGameInvite', {senderUserID, message: 'The other player has declined your game invitation.', token})
    setInvite(null);
  }

  return (
    <>
      {invite && (
        <Accept
          message={`${invite.senderUsername} has invited you for a game of Pong!`}
          senderUserID={invite.senderUserID}
          onAccept={() => handleAcceptGameInvite(invite.senderUserID)}
          onDecline={() => handleDeclineGameInvite(invite.senderUserID)}
        />
      )}
    </>
  );
};

export default ReceiveGameInvite;
