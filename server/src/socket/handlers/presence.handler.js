/**
 * socket/handlers/presence.handler.js
 * Manages online presence tracking within rooms.
 */
const redis = require('../../config/redis');
const EVENTS = require('../events');

// In-memory color assignment for remote cursors
const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#82E0AA', '#F0B27A',
];
const roomColorMap = new Map(); // roomCode -> Map(userId -> color)

const assignColor = (roomCode, userId) => {
  if (!roomColorMap.has(roomCode)) roomColorMap.set(roomCode, new Map());
  const map = roomColorMap.get(roomCode);
  if (!map.has(userId)) {
    map.set(userId, USER_COLORS[map.size % USER_COLORS.length]);
  }
  return map.get(userId);
};

const getOnlineUsers = async (io, roomCode) => {
  const userIds = await redis.getPresence(roomCode);
  const sockets = await io.in(roomCode).fetchSockets();
  // Return user objects from socket data (attached at join)
  const users = sockets
    .filter((s) => s.data?.user)
    .map((s) => ({
      id: s.data.user._id.toString(),
      name: s.data.user.name,
      avatar: s.data.user.avatar,
      color: assignColor(roomCode, s.data.user._id.toString()),
    }));
  // Deduplicate by user id
  return [...new Map(users.map((u) => [u.id, u])).values()];
};

const broadcastPresence = async (io, roomCode) => {
  const onlineUsers = await getOnlineUsers(io, roomCode);
  io.to(roomCode).emit(EVENTS.PRESENCE_UPDATE, { onlineUsers });
};

module.exports = { assignColor, getOnlineUsers, broadcastPresence };
