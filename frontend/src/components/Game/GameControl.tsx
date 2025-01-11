import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';

let g_socket: Socket;
let g_gameID: number;
let g_token: string;
let end: number = 0;
let paddleLeft: Paddle;
let paddleRight: Paddle;
let scoreLeft: number = 0;
let scoreRight: number = 0;

class Ball {
  x: number;
  y: number;
  diameter: number;
  speedX: number;
  speedY: number;
  context: any;
  gameID: number;
  constructor(x: number, y: number, diameter: number, context: any, gameID: number) {
    this.x = x;
    this.y = y;
    this.diameter = diameter;
    this.speedX = 0;
    this.speedY = 0;
    this.context = context;
    this.gameID = gameID;
  }
  left() {
    return this.x - this.diameter / 2;
  }
  right() {
    return this.x + this.diameter / 2;
  }
  top() {
    return this.y - this.diameter / 2;
  }
  bottom() {
    return this.y + this.diameter / 2;
  }
  move(width: number, height: number) {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.right() > width) {
      scoreLeft += 1;
      g_socket.emit('left scored', this.gameID);
      this.x = width / 2;
      this.y = height / 2;
    }
    if (this.left() < 0) {
      scoreRight += 1;
      g_socket.emit('right scored', this.gameID);
      this.x = width / 2;
      this.y = height / 2;
    }
    if (this.bottom() > height) {
      g_socket.emit('reverse ball speedY', this.gameID);
    }
    if (this.top() < 0) {
      g_socket.emit('reverse ball speedY', this.gameID);
    }
  }
  display() {
    this.context.beginPath();
    this.context.arc(this.x, this.y, this.diameter / 2, 0, 2 * Math.PI);
    this.context.stroke();
  }
}

class Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
  context: any;
  skinPath: string;
  topPosition: number;
  img: any;
  constructor(x: number, y: number, w: number, h: number, context: any, skin: string) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
	this.topPosition = this.y - this.h / 2;
    this.context = context;
	this.skinPath = "";
	if (skin === "option1")
		this.skinPath = "http://localhost:3001/images/pexels-lum3n-44775-406014.jpg";
	if (skin === "option2")
		this.skinPath = "http://localhost:3001/images/pexels-pixabay-259915.jpg";
	if (this.skinPath != "")
	{
		this.img = document.createElement("img");
		this.img.src = this.skinPath;
		this.img.width = this.w;
		this.img.height = this.h;

		// This next line will just add it to the <body> tag
		document.body.appendChild(this.img);
		this.img.setAttribute("style", "position:absolute;");;
		this.img.style.top = `${(window.innerHeight / 2) - (this.h / 2)}px`;
		this.img.style.left = `${this.x + (window.innerWidth / 2 - 250) - 20}px`;
	}
  }
  left() {
    return this.x - this.w / 2;
  }
  right() {
    return this.x + this.w / 2;
  }
  top() {
    return this.y - this.h / 2;
  }
  bottom() {
    return this.y + this.h / 2;
  }
  display(height: number) {
    if (this.bottom() > height) {
      this.y = height - this.h / 2;
    }
    if (this.top() < 0) {
      this.y = this.h / 2;
    }
    this.context.beginPath();
    this.context.rect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    this.context.stroke();
  }
}

function map_range(value: number, low1: number, high1: number, low2: number, high2: number) {
  return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
}

onkeydown = (event: KeyboardEvent) => {
  if (end)
	return;
  let move: string;
  if (event.key === 'ArrowUp') {
    move = 'up';
  }
  if (event.key === 'ArrowDown') {
    move = 'down';
  }
  if (move)
  	g_socket.emit('key', move, g_gameID, g_token);
};

const GameLogic = ({ socket, skin, token }) => {
	const canvasRef = useRef(null);
	const [context, setContext] = useState<any>(null);
	const [gameID, setGameID] = useState<number>(-1);
  const navigate = useNavigate();
  const canvas: any = React.useRef();
  const width: number = 500;
  const height: number = 500;
  let ball: Ball;
  g_socket = socket;
  g_token = token;
  const draw = (context, socket) => {
    context.clearRect(0, 0, width, height);
    ball.move(width, height);
    ball.display();
    paddleLeft.display(height);
    paddleRight.display(height);
    if (ball.left() < paddleLeft.right() && ball.y > paddleLeft.top() && ball.y < paddleLeft.bottom()) {
      ball.speedX = -ball.speedX;
	  socket.emit('hitPaddle', gameID, ball.y - paddleLeft.y, paddleLeft.h / 2);
    }
    if (ball.right() > paddleRight.left() && ball.y > paddleRight.top() && ball.y < paddleRight.bottom()) {
      ball.speedX = -ball.speedX;
	  socket.emit('hitPaddle', gameID, ball.y - paddleRight.y, paddleRight.h / 2);
    }
    context.fillText(scoreRight, width / 2 + 30, 30); // Right side score
    context.fillText(scoreLeft, width / 2 - 30, 30); // Left side score
    if (scoreLeft - scoreRight === 3 || scoreRight - scoreLeft === 3) {
      socket.emit('done', g_gameID);
      context.fillText("You've won, nice game!", width / 2, height / 2);
      end = 1;
      ball.x = width / 2;
      ball.y = height / 2;
      ball.speedX = 0;
      ball.speedY = 0;
	  setTimeout(() => {
		navigate('/landingpage');
	  }, 2000);
    }
  };

  useEffect(() => {
	let frameCount: number = 0;
	let frameId: number;
	const ctx: any = canvas.current.getContext('2d');

	if (ctx) {
	  setContext(ctx);
	}
	if (context)
	{
		context.strokeStyle = 'black';
		context.font = '80 px Arial';
		context.textAlign = 'center';
		context.lineWidth = 1;
		ball = new Ball(width / 2, height / 2, 50, context, gameID);
		paddleLeft = new Paddle(15, height / 2, 40, 200, context, skin);
		paddleRight = new Paddle(width - 15, height / 2, 40, 200, context, skin);
		socket.emit('start', gameID);
		g_gameID = gameID;
		socket.on('gameID', (gameID: number) => {
			setGameID(gameID);
			g_gameID = gameID;
		  });
		socket.on('ballSpeedY', (speed: string) => {
		  ball.speedY = parseInt(speed);
		});
		socket.on('ballSpeedX', (speed: string) => {
			ball.speedX = parseInt(speed);
		});
		socket.on('right up', () => {
		  console.log('right player up');
		  paddleRight.y -= 3;
		  if (paddleRight.skinPath != "")
		  {
			  paddleRight.topPosition -= 3;
			  paddleRight.img.style.top = `${paddleRight.topPosition}px`;
		  }
		});
		socket.on('left up', () => {
		  console.log('left player up');
		  paddleLeft.y -= 3;
		  if (paddleRight.skinPath != "")
		  {
			  paddleLeft.topPosition -= 3;
			  paddleLeft.img.style.top = `${paddleLeft.topPosition}px`;
		  }
		});
		socket.on('right down', () => {
		  console.log('right player down');
		  paddleRight.y += 3;
		  if (paddleRight.skinPath != "")
		  {
			  paddleRight.topPosition += 3;
			  paddleRight.img.style.top = `${paddleRight.topPosition}px`;
		  }
		});
		socket.on('left down', () => {
		  console.log('left player down');
		  paddleLeft.y += 3;
		  if (paddleRight.skinPath != "")
		  {
			  paddleLeft.topPosition += 3;
			  paddleLeft.img.style.top = `${paddleLeft.topPosition}px`;
		  }
		});
		socket.on('pause', () => {
			ball.speedX = 0;
			ball.speedY = 0;
		  });
	
		socket.on('disconnect', () => {
			console.log('game paused');
			ball.speedX = 0;
			ball.speedY = 0;
		  });
	
		socket.on('connect'), () => {
			socket.emit('reconnected', gameID);
		}
	
		const render = () => {
		  frameCount++;
		  draw(context, socket);
		  frameId = window.requestAnimationFrame(render);
		};
		render();
	}
	const onBeforeUnload = (ev) => {
		//user left the page
	  };
	window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.cancelAnimationFrame(frameId);
      socket.off('ballSpeedY');
      socket.off('right up');
      socket.off('left up');
      socket.off('right down');
      socket.off('left down');
	  window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [context]);

  return (
    <div>
      <canvas ref={canvas} height="500" width="500" style={{ border: '1px solid black' }} />
    </div>
  );
};

export default GameLogic;
