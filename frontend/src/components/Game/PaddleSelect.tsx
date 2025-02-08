// Game page that is shown when the user goes to localhost:3000/game

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
// import { emitter } from '../emitter'; // not final place

import GameControl from './GameControl';

const PaddleSelect = ({}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedPaddle, setSelectedPaddle] = useState<string>("");
  const [showGame, setShowGame] = useState<boolean>(false);
  const token = localStorage.getItem('authenticationToken');

  useEffect(() => {
    const socketIo: Socket = io(`${process.env.REACT_APP_URL_BACKEND_WS}/game`, {
      transports: ["websocket"],
      query: { token },
	  withCredentials: true,
    });

	// socketIo.on('connect_error', (error) => {
	// 	console.error('Connection Error', error.message);
	//   });

    // Set socket instance in state
    setSocket(socketIo);

	// socketIo.on('error', (gameID: number) => {
	// 	emitter.emit('error', error);
	//   });

    return () => {
	//   socketIo.off('error');
	//   socketIo.off('connect_error');
	  socketIo.disconnect(); // Disconnect the socket when the component unmounts
  };
  }, []);

  function handleChange(event) {
    setSelectedPaddle(event.target.value);
	socket.emit('getGameID', token);
	setShowGame(true);
  }

  return (
	<div>
		{showGame && (
			<GameControl socket={socket} skin={selectedPaddle} token={token} />
		)}
		{!showGame && (
			<div id="paddleselect">
				<label>
					<input type="radio" value="default" checked={selectedPaddle === 'default'} onChange={handleChange} />
					Default
				</label>
				<label>
					<input type="radio" value="option1" checked={selectedPaddle === 'option1'} onChange={handleChange} />
					<img className="button-image" src="http://localhost:3001/images/pexels-lum3n-44775-406014.jpg"></img>
					Doggo
				</label>
				<label>
					<input type="radio" value="option2" checked={selectedPaddle === 'option2'} onChange={handleChange} />
					<img className="button-image" src="http://localhost:3001/images/pexels-pixabay-259915.jpg"></img>
					Bricks
				</label>
			</div>
		)}
	</div> 
  );
};

export default PaddleSelect;
