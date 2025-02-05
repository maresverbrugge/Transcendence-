import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import axios from 'axios';
import { emitter } from '../emitter';

import { FriendData } from './interfaces';

interface NewChannelProps {
  friends: FriendData[];
  socket: Socket;
}


const NewChannel = ({ friends, socket }: NewChannelProps) => {
  const newChannelBoxRef = useRef<HTMLDivElement>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [channelName, setChannelName] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [isDM, setIsDM] = useState<boolean>(false);
  const [passwordEnabled, setPasswordEnabled] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<number>(null)
  const token = localStorage.getItem('authenticationToken');


  useEffect(() => {
    emitter.on('createChannel', () => {setIsCreating(true)});
    
    return () => {
      emitter.off('createChannel');
    };
  }, []);

  useEffect(() => {
      newChannelBoxRef.current?.focus();
  
  }, [isCreating]);
  
  const toggleMember = (userID: number) => {
    setSelectedFriends((prev) => (prev.includes(userID) ? prev.filter((id) => id !== userID) : [...prev, userID]));
  };

  const handleCreateChannel = async () => {
    try {
      const newChannelData = {
          name: channelName,
          isPrivate,
          isDM,
          passwordEnabled,
          password: passwordEnabled ? password : null,
          token,
          memberIDs: isPrivate ? (isDM ? [selectedFriend] : selectedFriends) : [],
        };
        const response = await axios.post(`${process.env.REACT_APP_URL_BACKEND}/chat/channel`, { newChannelData });
        socket.emit('newChannel', response.data);
        resetForm();
        emitter.emit('selectChannel', response.data.ID)
    } catch (error) {
        emitter.emit('error', error);
      }
    };
    
  const resetForm = () => {
    setIsCreating(false);
    setChannelName('');
    setIsPrivate(false);
    setIsDM(false);
    setPasswordEnabled(false);
    setPassword('');
    setSelectedFriends([]);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleCreateChannel();
      } else if (event.key === 'Escape') {
        resetForm();
      }
    };
  
  return (
    <>
      {isCreating && (
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
            className="card"
            onKeyDown={handleKeyDown}
            ref={newChannelBoxRef}
            tabIndex={0}
          >
            <div className="card-body"
              style={{
                zIndex: 9996,
              }}>
              <h4 className="card-title">Create New Channel</h4>
              <h6 className="card-subtitle mb-2 text-info">Create a public channel, a private channel or a direct message</h6>
              <div className="btn-group" role="group" aria-label="Basic radio toggle button group">
                <input type="radio" className="btn-check" name="btnradio" id="btnradio1" autoComplete="off" checked={!isPrivate && !isDM}
                    onChange={() => {
                      setIsPrivate(false);
                      setIsDM(false);
                      setPasswordEnabled(false);
                    }}/>
                <label className="btn btn-outline-info mt-2" htmlFor="btnradio1">Public</label>
                <input type="radio" className="btn-check" name="btnradio" id="btnradio2" autoComplete="off" checked={isPrivate && !isDM}
                    onChange={() => {
                      setIsPrivate(true);
                      setIsDM(false);
                      setPasswordEnabled(false);
                      setPassword('');
                    }}/>
                <label className="btn btn-outline-info mt-2" htmlFor="btnradio2">Private</label>
                <input type="radio" className="btn-check" name="btnradio" id="btnradio3" autoComplete="off" checked={isPrivate && isDM}
                    onChange={() => {
                      setIsPrivate(true);
                      setIsDM(true);
                      setPasswordEnabled(false);
                      setPassword('');
                    }} />
                <label className="btn btn-outline-info mt-2" htmlFor="btnradio3">DM</label>
              </div>
              {/* Channel Name */}
              {!isDM && (
                <>
                  <label className="col-form-label mt-1" htmlFor="inputDefault"></label>
                  <input type="text" className="form-control mt-2" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Channel Name"/>
                </>
              )}
              {/* Private Channel */}
              {isPrivate && !isDM &&(
                <fieldset>
                  <legend className="mt-2">Add Friends</legend>
                  {friends.map((friend) => (
                    <div className="form-check">
                      <input className="form-check-input"
                        type="checkbox"
                        checked={selectedFriends.includes(friend.ID)}
                        onChange={() => toggleMember(friend.ID)} 
                        style={{
                          backgroundColor: selectedFriends.includes(friend.ID) ? "#0dcaf0" : "",
                          borderColor: selectedFriends.includes(friend.ID) ? "#0dcaf0" : "",
                          boxShadow: selectedFriends.includes(friend.ID)
                            ? "0 0 0 0.2rem rgba(13, 202, 240, 0.5)"
                            : "none",
                          transition: "background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                        }}/>
                      <label className="form-check-label" htmlFor="flexCheckDefault" key={friend.ID}>
                        {friend.username}
                      </label>
                    </div>
                  ))}
                </fieldset>
              )}
              {/* DM */}
              {isPrivate && isDM &&(
                <fieldset>
                  <legend className="mt-2">Pick a Friend</legend>
                  {friends.map((friend) => (
                    <div className="form-check">
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
              )}

              {/* Password */}
              {!isPrivate && (
                <div>
                  <fieldset>
                    <legend className="mt-2">Password</legend>
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" onClick={() =>setPasswordEnabled(!passwordEnabled)} checked={passwordEnabled}
                        style={{
                          backgroundColor: passwordEnabled ? "#0dcaf0" : "",
                          borderColor: passwordEnabled ? "#0dcaf0" : "",
                          boxShadow: passwordEnabled
                            ? "0 0 0 0.2rem rgba(13, 202, 240, 0.5)"
                            : "none",
                          transition: "background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
                        }}
                      />
                      <label className="form-check-label" >{passwordEnabled? 'Disable' : 'Enable'}</label>
                    </div>
                  </fieldset>
                  {passwordEnabled && (
                    <div>
                      <input type="password" className="form-control mt-1" id="exampleInputPassword1" placeholder="Password" autoComplete="off"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
              <button type="button" className="btn btn-outline-info mt-2" onClick={handleCreateChannel} >Done</button>
              <button type="button" className="btn btn-outline-info mt-2" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NewChannel;