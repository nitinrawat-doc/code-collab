/**
 * middleware/authorize.js
 * Room-level authorization checks.
 * Usage: authorize('owner') or authorize('member')
 * Must be used AFTER authenticate middleware.
 * Expects req.room to be populated by the route handler or a prior middleware.
 */
const ApiError = require('../utils/ApiError');
const Room = require('../models/Room');

/**
 * Middleware factory for room-level role authorization.
 * @param {'owner'|'member'} requiredRole
 */
const authorize = (requiredRole = 'member') => {
  return async (req, res, next) => {
    try {
      const { roomCode } = req.params;
      if (!roomCode) return next(ApiError.badRequest('Room code required'));

      const room = await Room.findOne({ roomCode });
      if (!room) return next(ApiError.notFound('Room not found'));
      if (room.status === 'closed') return next(ApiError.forbidden('Room is closed'));

      const userId = req.user._id;

      if (requiredRole === 'owner') {
        if (!room.isOwner(userId)) {
          return next(ApiError.forbidden('Only the room owner can perform this action'));
        }
      } else {
        // 'member' — owner is also a member
        if (!room.isMember(userId)) {
          return next(ApiError.forbidden('You are not a member of this room'));
        }
      }

      req.room = room; // attach for downstream use
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = authorize;
