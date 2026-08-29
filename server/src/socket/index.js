/**
 * socket/index.js
 * Sets up the Socket.IO server with JWT authentication middleware
 * and registers all event handlers.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/env');
const { registerRoomHandlers } = require('./handlers/room.handler');
const { registerEditorHandlers } = require('./handlers/editor.handler');
const { registerChatHandlers } = require('./handlers/chat.handler');
const { registerTerminalHandlers } = require('./handlers/terminal.handler');

const initSocket = (io) => {
  /**
   * Socket.IO authentication middleware.
   * Verifies JWT token from socket handshake auth.
   * Attaches socket.user before any events are processed.
   */
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      socket.data.user = user; // Also set on data for io.in(room).fetchSockets() access
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] Connected: ${socket.user.name} (${socket.id})`);

    // Register all event handlers
    registerRoomHandlers(io, socket);
    registerEditorHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerTerminalHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`[socket] Disconnected: ${socket.user?.name} — ${reason}`);
    });
  });

  return io;
};

module.exports = { initSocket };
