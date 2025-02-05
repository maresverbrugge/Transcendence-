import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import axios from 'axios';

import { FriendData } from './interfaces';
import { emitter } from '../emitter';

interface AddMemberProps {
  friends: FriendData[];
  socket: Socket;
}

const AddChannelMember = ({ friends, socket }: AddMemberProps) => {
  const addChannelMemberBoxRef = useRef<HTMLDivElement>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [selectedFriend, setSelectedFriend] = useState<number | null>(null);
  const [channelID, setChannelID] = useState<number | null>(null);
  const token = localStorage.getItem('authenticationToken');

  useEffect(() => {
      emitter.on('addChannelMember', showAddChannelMember);
      
      return () => {
        emitter.off('addChannelMember', showAddChannelMember);
      };
    }, [channelID, friends, socket]);

  useEffect(() => {
        addChannelMemberBoxRef.current?.focus();
    
    }, [isAdding]);

  const showAddChannelMember = (targetChannelID: number) => {
    setChannelID(targetChannelID);
    setIsAdding(true);
  }

  const handleAddMember = async () => {
    if (!selectedFriend) {
      emitter.emit('alert', 'Please select a friend to add to the channel!');
      return;
    }

    const newMemberData = {
      channelID: channelID,
      memberID: selectedFriend,
      token,
    };
    try {
      await axios.post(`${process.env.REACT_APP_URL_BACKEND}/chat/channel/newMember`, { newMemberData });
      socket.emit('updateChannel', selectedFriend);
      resetForm();
    } catch (error) {
        emitter.emit('error', error);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setSelectedFriend(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
          handleAddMember();
        } else if (event.key === 'Escape') {
          resetForm();
        }
    };

  return (
    <>
      {isAdding && (
        <div
          className="d-flex flex-column justify-content-center align-items-center"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9997,
          }}
        >

          <div
            className="card"
            onKeyDown={handleKeyDown}
            ref={addChannelMemberBoxRef}
            tabIndex={0}
          >
            <div className="card-body"
              style={{
                zIndex: 9998,
              }}>
              <h4 className="card-title">Select a Friend to add to the Channel</h4>
              <fieldset>
                  {friends.map((friend) => (
                    <div key={`friend${friend.ID}`} className="form-check">
                      <input className="form-check-input"
                        type="radio"
                        name="optionsRadios"
                        id={`optionsRadios${friend.ID}`}
                        value={`option${friend.ID}`}
                        checked={selectedFriend === friend.ID}
                        onChange={() => setSelectedFriend(friend.ID)} 
                        style={{
                          backgroundColor: selectedFriend === friend.ID ? "#0dcaf0" : "",
                          borderColor: selectedFriend === friend.ID ? "#0dcaf0" : "",
                          boxShadow: selectedFriend === friend.ID
                            ? "0 0 0 0.2rem rgba(13, 202, 240, 0.5)"
                            : "none",
                          transition: "background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                        }}/>
                      <label className="form-check-label" htmlFor={`optionsRadios${friend.ID}`} key={friend.ID}>
                        {friend.username}
                      </label>
                    </div>
                  ))}
                </fieldset>
              <button type="button" className="btn btn-outline-info mt-2" onClick={handleAddMember} >Done</button>
              <button type="button" className="btn btn-outline-info mt-2" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AddChannelMember;
