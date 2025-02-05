import React, { useState, useEffect, useRef } from 'react';
import { emitter } from '../emitter';
import axios from 'axios';

const PasswordPrompt = () => {
  const PasswordPromptRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState<string>('');
  const [passwordPromptVisible, setPasswordPromptVisible] = useState<boolean>(false);
  const [selectedChannelForPassword, setSelectedChannelForPassword] = useState<number | null>(null);

  useEffect(() => {
    emitter.on('showPasswordPrompt', (channelID) => showPasswordPrompt(channelID))
  
    return () => {
      emitter.off('showPasswordPrompt');
    }
  }, []);

  useEffect(() => {
    PasswordPromptRef.current?.focus();

  }, [passwordPromptVisible]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSubmit();
    } else if (event.key === 'Escape') {
      setPasswordPromptVisible(false);
    }
  };

  const showPasswordPrompt = (channelID: number) => {
    setSelectedChannelForPassword(channelID);
    setPasswordPromptVisible(true);
  }

  const handlePasswordSubmit = async (password: string) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_URL_BACKEND}/chat/channel/${selectedChannelForPassword}/verify-password`, { password })
      if (response.status ===  200) {
        emitter.emit('selectChannel', selectedChannelForPassword);
        setPasswordPromptVisible(false);
      } else {
        emitter.emit('alert', 'Incorrect password');
      }
    } catch (error) {
      emitter.emit('error', error);
    }
  };

  const handleSubmit = () => {
    handlePasswordSubmit(password);
  };

  return (
    <>
      {passwordPromptVisible && (
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
            ref={PasswordPromptRef}
            tabIndex={0} // Make the div focusable
          >
            <div className="card-body"
              style={{
                zIndex: 9996,
              }}>
              <h4 className="card-title text-center text-warning">Enter Channel Password</h4>

              <div className="form-floating has-">
                <input type="password"
                  className="form-control"
                  placeholder="Password"
                  autoComplete={'off'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}/>
                <label className="text-warning" htmlFor="floatingPassword">Password</label>
              </div>


              <div>
                <button type="button" className="btn btn-outline-warning mt-2" onClick={handleSubmit}>Submit</button>
                <button type="button" className="btn btn-outline-warning mt-2" onClick={() => {setPasswordPromptVisible(false)}}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PasswordPrompt;
