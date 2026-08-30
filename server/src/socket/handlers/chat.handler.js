/**
 * socket/handlers/chat.handler.js
 * Handles real-time chat within rooms.
 */
const Room = require('../../models/Room');
const ChatMessage = require('../../models/ChatMessage');
const EVENTS = require('../events');
const { sanitizeMessage } = require('../../utils/sanitize');

const registerChatHandlers = (io, socket) => {
  socket.removeAllListeners(EVENTS.CHAT_SEND);
  socket.on(EVENTS.CHAT_SEND, async ({ roomCode, content }) => {
    try {
      if (!roomCode || !content || !content.trim()) return;

      const normalizedCode = roomCode.trim().toUpperCase();

      // Sanitize content
      const clean = sanitizeMessage(content.trim());
      if (!clean || clean.length > 2000) return;

      // Find room using normalized uppercase code
      const room = await Room.findOne({ roomCode: normalizedCode }).select('_id roomCode');
      if (!room) return;

      // Persist to DB
      const message = await ChatMessage.create({
        room: room._id,
        sender: socket.user._id,
        senderName: socket.user.name,
        content: clean,
      });

      const payload = {
        id: message._id.toString(),
        sender: {
          id: socket.user._id.toString(),
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
        content: clean,
        createdAt: message.createdAt,
      };

      // Broadcast to all room sockets regardless of casing
      io.to(room.roomCode).to(normalizedCode).to(roomCode).emit(EVENTS.CHAT_MESSAGE, payload);
    } catch (err) {
      console.error('[socket] chat:send error:', err.message);
    }
  });
};

module.exports = { registerChatHandlers };
