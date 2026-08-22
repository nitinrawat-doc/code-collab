/**
 * routes/room.routes.js
 */
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const roomController = require('../controllers/room.controller');

const createRoomSchema = Joi.object({
  name: Joi.string().min(2).max(60).required(),
});

const setProblemSchema = Joi.object({
  problemId: Joi.string().allow(null, '').optional(),
});

// All room routes require authentication
router.use(authenticate);

router.post('/', validate(createRoomSchema), roomController.createRoom);
router.get('/', roomController.getUserRooms);
router.get('/:roomCode', roomController.getRoomByCode);
router.post('/:roomCode/join', roomController.joinRoom);
router.delete('/:roomCode', roomController.closeRoom);
router.delete('/:roomCode/members/:userId', roomController.removeMember);
router.patch('/:roomCode/problem', validate(setProblemSchema), roomController.setCurrentProblem);

module.exports = router;
