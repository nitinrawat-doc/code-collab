/**
 * controllers/room.controller.js
 */
const roomService = require('../services/room.service');
const EVENTS = require('../socket/events');

const createRoom = async (req, res, next) => {
  try {
    const room = await roomService.createRoom({ name: req.body.name, userId: req.user._id });
    res.status(201).json({ success: true, room });
  } catch (err) { next(err); }
};

const getUserRooms = async (req, res, next) => {
  try {
    const rooms = await roomService.getUserRooms(req.user._id);
    res.json({ success: true, rooms });
  } catch (err) { next(err); }
};

const getRoomByCode = async (req, res, next) => {
  try {
    const room = await roomService.getRoomByCode(req.params.roomCode, req.user._id);
    res.json({ success: true, room });
  } catch (err) { next(err); }
};

const joinRoom = async (req, res, next) => {
  try {
    const room = await roomService.joinRoom(req.params.roomCode, req.user._id);
    res.json({ success: true, room });
  } catch (err) { next(err); }
};

const removeMember = async (req, res, next) => {
  try {
    const room = await roomService.removeMember(
      req.params.roomCode,
      req.params.userId,
      req.user._id
    );

    // Notify the removed member via socket
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.roomCode).emit(EVENTS.MEMBER_REMOVED, {
        userId: req.params.userId,
        roomCode: req.params.roomCode,
      });
    }

    res.json({ success: true, room });
  } catch (err) { next(err); }
};

const closeRoom = async (req, res, next) => {
  try {
    const room = await roomService.closeRoom(req.params.roomCode, req.user._id);

    // Broadcast room closure to all members in the socket room
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.roomCode).emit(EVENTS.ROOM_CLOSED, {
        roomCode: req.params.roomCode,
        message: 'Room has been closed by the owner',
      });
    }

    res.json({ success: true, message: 'Room closed', room });
  } catch (err) { next(err); }
};

const setCurrentProblem = async (req, res, next) => {
  try {
    const room = await roomService.setCurrentProblem(
      req.params.roomCode,
      req.body.problemId,
      req.user._id
    );

    // Broadcast the problem change to all room members via socket
    const io = req.app.get('io');
    if (io && room.currentProblem) {
      io.to(req.params.roomCode).emit(EVENTS.PROBLEM_UPDATE, {
        problem: room.currentProblem,
      });
    }

    res.json({ success: true, room });
  } catch (err) { next(err); }
};

module.exports = { createRoom, getUserRooms, getRoomByCode, joinRoom, removeMember, closeRoom, setCurrentProblem };
