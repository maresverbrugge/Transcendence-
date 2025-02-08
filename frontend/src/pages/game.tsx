// Game page that is shown when the user goes to localhost:3000/game

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import PaddleSelect from '../components/Game/PaddleSelect';
// import { emitter } from '../emitter'; // not final place

const Game = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const token = localStorage.getItem('authenticationToken');
  const [inQueue, setInQueue] = useState<boolean>(false);
  const [joinedGame, setJoinedGame] = useState<boolean>(false);

  useEffect(() => {

    // Initialize socket connection
    const socketIo: Socket = io(`${process.env.REACT_APP_URL_BACKEND_WS}/matchmaking`, { // localhost veranderen naar react_app_var
      transports: ["websocket"],
      query: { token },
	  withCredentials: true,
    });

    socketIo.on('newGame', () => {
      setJoinedGame(true);
    });

	// socketIo.on('error', (gameID: number) => {
	// 	emitter.emit('error', error);
	//   });

    // Set socket instance in state
    setSocket(socketIo);

    return () => {
      socketIo.off('newGame');
    //   socketIo.off('error');
      socketIo.disconnect(); // Disconnect the socket when the component unmounts
    };
  }, []);

  const joinQueue = (token) => {
	socket.emit('joinqueue', token);
	setInQueue(true);
  };

  const leaveQueue = (token) => {
	socket.emit('leavequeue', token);
	setInQueue(false);
  };

  if (!socket) {
    return;
  }

  return (
	<div>
		{joinedGame && (
			<PaddleSelect/>
		)}
		{!joinedGame && (
			<div className="games-startup">
				{inQueue && (
					<button onClick={() => leaveQueue(token)}>{`I don't want to play anymore`}</button>
				)}
				{!inQueue && (
					<button onClick={() => joinQueue(token)}>{`Wanna play?`}</button>
				)}
				<label>Join the queue to play.</label>
			</div>
		)}
	</div>
  );
};

export default Game;
