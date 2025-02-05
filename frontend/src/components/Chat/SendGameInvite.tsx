import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { emitter } from '../emitter';

const SendGameInvite = ({ socket } : {socket: Socket} ) => {
  const sendGameInviteBoxRef = useRef<HTMLDivElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [receiverUserID, setReceiverUserID] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('authenticationToken');

  
  useEffect(() => {
    sendGameInviteBoxRef.current?.focus();
  
    const handleInviteResponse = (data: { accepted: boolean; message: string, receiverUserID: number }) => {
      if (data.receiverUserID === receiverUserID) {
        setIsPending(false);
        if (data.accepted) {
          handleAcceptResponse();
        } else {
          emitter.emit('alert', data.message)
        }
      }
    };
  
    const handleAcceptOtherGameInvite = () => {
      if (isPending)
        handleCancelInvite();
    }
  
    const handleSendGameInvite = (userID: number) => {
      setReceiverUserID(userID);
      setIsPending(true);
    }
  
    emitter.on('acceptOtherGameInvite', handleAcceptOtherGameInvite);
  
    emitter.on('sendGameInvite', handleSendGameInvite);
  
    socket.on('gameInviteResponse', handleInviteResponse);
  
    return () => {
      emitter.off('acceptOtherGameInvite');
      emitter.off('sendGameInvite', handleSendGameInvite);
      socket.off('gameInviteResponse', handleInviteResponse);
    };
  }, [socket, isPending, receiverUserID]);

  const handleCancelInvite = () => {
    socket.emit('cancelGameInvite', { receiverUserID, token });
    setIsPending(false);
  };

  const handleAcceptResponse = async () => {
    emitter.emit('alert', 'The other player has accepted your game invitation.')
    try {
      const response = await axios.post(`${process.env.REACT_APP_URL_BACKEND}/game/creategame/${token}/${receiverUserID}`, {});
      if (response.status === 201) {
        socket.emit('gameCreated', {receiverUserID, created: true, token});
        navigate('/game');
      } else {
        socket.emit('gameCreated', {receiverUserID, created: false, token});
        emitter.emit('alert', 'Failed to create the game, please try again');
      }
    } catch (error) {
      emitter.emit('error', error);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancelInvite();
      }
  };

  return (
  <>
    {isPending && receiverUserID && (
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 9995,
        }}
      >
        <div
          className="alert alert-dismissible alert-success"
          onKeyDown={handleKeyDown}
          ref={sendGameInviteBoxRef}
          tabIndex={0}
          style={{
            zIndex: 9996,
            maxWidth: "500px",
            padding: "20px",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <h4 className="alert-heading">Game invitation send</h4>
          <p className="message">Waiting for the other player to respond...</p>
          <button
            type="button"
            className="btn btn-outline-light m-1"
            onClick={() => handleCancelInvite()}
          >Cancel</button>
        </div>
      </div>
      )}
    </>
  );
};

export default SendGameInvite;
