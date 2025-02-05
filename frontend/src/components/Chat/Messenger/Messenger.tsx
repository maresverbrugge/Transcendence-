import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import axios from 'axios';
import { emitter } from '../../emitter';

import { MessageData } from '../interfaces';

interface MessengerProps {
  channelID: number | null;
  socket: Socket;
}

const Messenger = ({ channelID, socket }: MessengerProps) => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const token = localStorage.getItem('authenticationToken');
  const messageListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get<MessageData[]>(
          `${process.env.REACT_APP_URL_BACKEND}/chat/message/channel/${channelID}/${token}`
        );
        setMessages(response.data);
      } catch (error) {
        emitter.emit('error', error);
    }
    };

    if (channelID) {
      fetchMessages();
    }

    const fetchMessage = async (messageID: number) => {
      try {
        const response = await axios.get<MessageData>(`${process.env.REACT_APP_URL_BACKEND}/chat/message/${messageID}/${token}`);
        const newMessage = response.data;
  
        setMessages((prevMessages) => {
          if (prevMessages.some((message) => message.ID === newMessage.ID)) {
            return prevMessages;
          }
          return [...prevMessages, newMessage];
        });
      } catch (error) {
        emitter.emit('error', error);
      }
    };

    socket.on('newMessage', ({ messageID }: { messageID: number }) => {
      setMessages((prevMessages) => {
        if (prevMessages.length === 0 || prevMessages[prevMessages.length - 1].ID !== messageID) {
          fetchMessage(messageID);
        }
        return prevMessages;
      });
    });
    
    socket.on('reloadMessages', fetchMessages)

    return () => {
      socket.off('newMessage');
      socket.off('reloadMessages')
    };
  }, [channelID, socket]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      socket.emit('sendMessage', { channelID, token, content: newMessage });
      setNewMessage('');
    }
  };

  return (
    <div className="col-12 col-sm-12 col-md-6 p-3 pt-0 pb-0" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card shadow h-100">
        <div className="card-body p-3 pb-2" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="messenger-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {!channelID ? (
                <div className="select-channel-message text-center"><h5>Select a channel to start chatting!</h5></div>
              ) : (
                <>
                  {/* Message List */}
                  <div
                    className="message-list"
                    style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '1rem' }}
                    ref={messageListRef}
                  >
                    {(!messages || messages.length === 0) ? (
                      <div className="text-center"><h5>No messages yet.</h5><h6>Send the first one!</h6></div>
                    ) : (
                      <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                        {messages?.map((message) => (
                          <li key={`message${message.ID}`}>
                            {message.senderID && message.senderName ? (
                              <>
                                <strong>{message.senderName}: </strong>
                                {message.content}
                              </>
                            ) : (
                              <em>{message.content}</em>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
      
                  {/* Messenger Input */}
                  <div className="input-group mb-3">
                    <input
                      type="text"
                      className="form-control"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message..."
                      aria-label="Recipient's username"
                      aria-describedby="button-addon2"
                    />
                    <button
                      className="btn btn-primary"
                      type="button"
                      onClick={handleSendMessage}
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>  
    </div>
  );
};

export default Messenger;
