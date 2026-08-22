/**
 * services/room.service.js
 * Business logic for room creation, membership, and management.
 */
const Room = require('../models/Room');
const CodingSession = require('../models/CodingSession');
const ApiError = require('../utils/ApiError');

/**
 * Creates a room and its initial CodingSession.
 */
const createRoom = async ({ name, userId }) => {
  const room = await Room.create({
    name,
    owner: userId,
    members: [{ user: userId, role: 'owner' }],
  });

  // Create the associated coding session
  await CodingSession.create({ room: room._id });

  return room.populate('owner', 'name email avatar');
};

/**
 * Returns rooms where user is a member (most recent first).
 */
const getUserRooms = async (userId) => {
  return Room.find({ 'members.user': userId })
    .populate('owner', 'name email avatar')
    .populate('currentProblem', 'title slug difficulty')
    .sort({ updatedAt: -1 })
    .limit(20);
};

/**
 * Returns a single room by roomCode.
 * Throws if not found or user is not a member.
 */
const getRoomByCode = async (roomCode, userId) => {
  const room = await Room.findOne({ roomCode })
    .populate('owner', 'name email avatar')
    .populate('members.user', 'name email avatar')
    .populate('currentProblem', 'title slug difficulty');

  if (!room) throw ApiError.notFound('Room not found');
  if (!room.isMember(userId)) throw ApiError.forbidden('You are not a member of this room');

  return room;
};

/**
 * Joins a user to a room.
 */
const joinRoom = async (roomCode, userId) => {
  const room = await Room.findOne({ roomCode });
  if (!room) throw ApiError.notFound('Room not found');
  if (room.status === 'closed') throw ApiError.forbidden('This room is closed');

  // If already a member, return the room cleanly
  if (room.isMember(userId)) {
    await room.populate('owner', 'name email avatar');
    await room.populate('members.user', 'name email avatar');
    return room;
  }

  if (room.members.length >= room.maxMembers) {
    throw ApiError.forbidden(`Room is full (max ${room.maxMembers} members)`);
  }

  room.members.push({ user: userId, role: 'member' });
  await room.save();

  await room.populate('owner', 'name email avatar');
  await room.populate('members.user', 'name email avatar');
  return room;
};

/**
 * Removes a member from a room (owner action).
 */
const removeMember = async (roomCode, targetUserId, requestingUserId) => {
  const room = await Room.findOne({ roomCode });
  if (!room) throw ApiError.notFound('Room not found');
  if (!room.isOwner(requestingUserId)) throw ApiError.forbidden('Only the owner can remove members');
  if (room.owner.toString() === targetUserId) throw ApiError.badRequest('Owner cannot be removed');

  room.members = room.members.filter((m) => m.user.toString() !== targetUserId);
  await room.save();
  return room;
};

/**
 * Closes and deletes a room (owner action).
 */
const closeRoom = async (roomCode, userId) => {
  const room = await Room.findOne({ roomCode });
  if (!room) throw ApiError.notFound('Room not found');
  if (!room.isOwner(userId)) throw ApiError.forbidden('Only the owner can close this room');

  room.status = 'closed';
  await room.save();
  return room;
};

/**
 * Sets the current problem for a room.
 */
const setCurrentProblem = async (roomCode, problemId, userId) => {
  const room = await Room.findOne({ roomCode });
  if (!room) throw ApiError.notFound('Room not found');
  if (!room.isMember(userId)) throw ApiError.forbidden('Not a member');

  room.currentProblem = problemId || null;
  await room.save();

  await room.populate('currentProblem', 'title slug difficulty description constraints examples starterCode tags testCases');
  return room;
};

module.exports = { createRoom, getUserRooms, getRoomByCode, joinRoom, removeMember, closeRoom, setCurrentProblem };
