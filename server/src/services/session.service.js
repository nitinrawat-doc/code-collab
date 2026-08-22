/**
 * services/session.service.js
 * Manages the live coding session for a room.
 */
const CodingSession = require('../models/CodingSession');
const Room = require('../models/Room');
const ApiError = require('../utils/ApiError');
const redis = require('../config/redis');

const getSession = async (roomCode, userId) => {
  const room = await Room.findOne({ roomCode });
  if (!room) throw ApiError.notFound('Room not found');
  if (!room.isMember(userId)) throw ApiError.forbidden('Not a member of this room');

  const session = await CodingSession.findOne({ room: room._id }).populate('problem', 'title slug starterCode');
  if (!session) throw ApiError.notFound('Session not found');

  return session;
};

const updateCode = async (roomCode, { code, language, version }) => {
  const room = await Room.findOne({ roomCode });
  if (!room) throw ApiError.notFound('Room not found');

  const session = await CodingSession.findOne({ room: room._id });
  if (!session) throw ApiError.notFound('Session not found');

  // Only update if incoming version is >= current (last-write-wins with staleness guard)
  if (version < session.version) {
    return { stale: true, session };
  }

  session.currentCode = code;
  session.language = language || session.language;
  session.version += 1;
  await session.save();

  // Update Redis cache
  await redis.setCode(roomCode, code);

  return { stale: false, session };
};

module.exports = { getSession, updateCode };
