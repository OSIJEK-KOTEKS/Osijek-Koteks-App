import { io, Socket } from 'socket.io-client';

const SOCKET_URL =
  process.env.REACT_APP_API_URL || 'https://osijek-koteks-app.onrender.com';

const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

export default socket;
