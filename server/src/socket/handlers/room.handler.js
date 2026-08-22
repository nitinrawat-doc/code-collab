/**
 * socket/handlers/room.handler.js
 * Handles room:join and room:leave events.
 */
const Room = require('../../models/Room');
const CodingSession = require('../../models/CodingSession');
const ChatMessage = require('../../models/ChatMessage');
const EVENTS = require('../events');
const redis = require('../../config/redis');
const { broadcastPresence, assignColor } = require('./presence.handler');

const registerRoomHandlers = (io, socket) => {
  /**
   * room:join
   * Validates membership, joins the Socket.IO room,
   * sends full state to the joiner, and broadcasts presence.
   */
  socket.on(EVENTS.ROOM_JOIN, async ({ roomCode }) => {
    try {
      if (!roomCode) return socket.emit(EVENTS.ERROR, { message: 'roomCode required' });

      const room = await Room.findOne({ roomCode })
        .populate('members.user', 'name email avatar')
        .populate('currentProblem', 'title slug difficulty starterCode constraints examples description');

      if (!room) return socket.emit(EVENTS.ERROR, { message: 'Room not found' });
      if (room.status === 'closed') return socket.emit(EVENTS.ERROR, { message: 'Room is closed' });
      if (!room.isMember(socket.user._id)) {
        return socket.emit(EVENTS.ERROR, { message: 'You are not a member of this room' });
      }

      // Join the Socket.IO room namespace
      socket.join(roomCode);
      socket.data.roomCode = roomCode;

      // Track presence in Redis/memory
      await redis.addPresence(roomCode, socket.user._id.toString());

      // Fetch current session code
      const session = await CodingSession.findOne({ room: room._id });

      // Fetch last 50 chat messages
      const chatHistory = await ChatMessage.find({ room: room._id })
        .sort({ createdAt: 1 })
        .limit(50)
        .populate('sender', 'name avatar');

      // Send full state to the joining client
      socket.emit(EVENTS.ROOM_STATE, {
        code: session?.currentCode || '// Start coding here\n',
        language: session?.language || 'javascript',
        version: session?.version || 0,
        problem: room.currentProblem || null,
        members: room.members,
        chatHistory,
      });

      // Broadcast updated presence to everyone in room
      await broadcastPresence(io, roomCode);

      console.log(`[socket] ${socket.user.name} joined room ${roomCode}`);
    } catch (err) {
      console.error('[socket] room:join error:', err.message);
      socket.emit(EVENTS.ERROR, { message: 'Failed to join room' });
    }
  });

  /**
   * room:leave
   * Explicit leave (also called on disconnect cleanup).
   */
  socket.on(EVENTS.ROOM_LEAVE, async ({ roomCode }) => {
    await handleLeave(io, socket, roomCode);
  });

  /**
   * Disconnect — clean up any rooms the socket was in.
   */
  socket.on('disconnect', async () => {
    const roomCode = socket.data?.roomCode;
    if (roomCode) await handleLeave(io, socket, roomCode);
  });
};

const handleLeave = async (io, socket, roomCode) => {
  try {
    socket.leave(roomCode);
    await redis.removePresence(roomCode, socket.user._id.toString());
    await broadcastPresence(io, roomCode);
    console.log(`[socket] ${socket.user.name} left room ${roomCode}`);
  } catch (err) {
    console.error('[socket] leave error:', err.message);
  }
};

module.exports = { registerRoomHandlers, handleLeave };
