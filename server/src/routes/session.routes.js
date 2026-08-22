const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const sessionController = require('../controllers/session.controller');
router.use(authenticate);
router.get('/room/:roomCode', sessionController.getSession);
router.post('/room/:roomCode/save', sessionController.saveVersion);
module.exports = router;
