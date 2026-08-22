/**
 * socket/socketClient.js
 * Singleton Socket.IO client with dynamic host IP resolution for cross-device support.
 */
import { io } from 'socket.io-client';

const getServerUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    const rawUrl = import.meta.env.VITE_SERVER_URL;
    if (rawUrl.includes('localhost') && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return rawUrl.replace('localhost', window.location.hostname);
    }
    return rawUrl;
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:5000`;
};

let socket = null;
let _token = null;

export const getSocket = () => socket;
export const getToken = () => _token;

export const connectSocket = (token) => {
  if (token) _token = token;
  const authToken = token || _token;

  if (socket && socket.connected) return socket;
  if (socket && !authToken) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const serverUrl = getServerUrl();

  socket = io(serverUrl, {
    auth: { token: authToken },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => console.log('[socket] Connected to', serverUrl, 'ID:', socket.id));
  socket.on('disconnect', (reason) => console.log('[socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.error('[socket] Connection error:', err.message));

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  _token = null;
};
