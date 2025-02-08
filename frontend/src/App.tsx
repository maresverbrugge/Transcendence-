import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MainPage from './pages/landingPage';
import Login from './components/Authentication/Login';
import SetUp2FA from './components/Authentication/SetUp2FA';
import Verify2FA from './components/Authentication/Verify2FA';
import LoginRedirect from './components/Authentication/LoginRedirect';
import ProtectedRoute from './components/Authentication/ProtectedRoute';
import LogOut from './components/Authentication/LogOut';
import UserPage from './pages/UserPage';
import Chat from './pages/Chat';
import Game from './pages/game';
import PaddleSelect from './components/Game/PaddleSelect';
import ErrorHandler from './components/ErrorHandler';
import Leaderboard from './components/User/Shared/Leaderboard';

const App = () => (
  <Router>
	<ErrorHandler/>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login/redirect" element={<LoginRedirect />} />
      <Route path="/login/set-up-2fa" element={<ProtectedRoute element={<SetUp2FA />} />} />
      <Route path="/login/verify-2fa" element={<Verify2FA />} />
      <Route path="/logout" element={<LogOut />} />
      <Route path="/main" element={<ProtectedRoute element={<MainPage />} />} />
      <Route path="/profile" element={<ProtectedRoute element={<UserPage />} />} />
      <Route path="/profile/:userID" element={<ProtectedRoute element={<UserPage />} />} />
      <Route path="/chat" element={<ProtectedRoute element={<Chat />} />} />
      <Route path="/leaderboard/" element={<ProtectedRoute element={<Leaderboard />} />} />
	  <Route path="/queue" element={<ProtectedRoute element={<Game />}  />} />
	  <Route path="/game" element={<ProtectedRoute element={<PaddleSelect />}  />} />
    </Routes>
  </Router>
);

export default App;