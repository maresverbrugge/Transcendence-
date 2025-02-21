import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const MainPage = () => {
  const navigate = useNavigate();
  
  return (
    <div>
      <h1>Welcome to the Main Page</h1>
      <button onClick={() => navigate('/queue')}>Go to Game</button>
      <button onClick={() => navigate('/chat')}>Go to Chat</button>
      <button onClick={() => navigate('/leaderboard')}>Go to Leaderboard</button>
      <button onClick={() => navigate('/profile')}>My Account</button>
      <button onClick={() => navigate('/profile/2')}>TESTING: View Profile (UserID=2)</button>
    </div>
  );
};

export default MainPage;

//! let op, User Profile: user ID is hier gehard-code!!!

