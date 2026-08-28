/**
 * socket/socketClient.js
 * Singleton Socket.IO client with correct server URL resolution for cross-device support.
 *
 * URL resolution strategy (mirrors api.js):
 *  - localhost / 127.0.0.1  → direct to VITE_SERVER_URL (dev)
 *  - No explicit port (tunnel, ngrok)  → window.location.origin (same host, standard port)
 *  - Explicit port (LAN e.g. :5173)    → same host but port 5000
 */
import { io } from 'socket.io-client';

const getServerUrl = () => {
  const { protocol, hostname, port } = window.location;

  // Local dev — use VITE_SERVER_URL or fallback to :5000
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
  }

  // Tunnel / deployed — no explicit port, same origin
  if (!port || port === '80' || port === '443') {
    return `${protocol}//${hostname}`;
  }

  // LAN explicit port → backend is on :5000
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
    extraHeaders: {
      'Bypass-Tunnel-Reminder': 'true',
    },
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
