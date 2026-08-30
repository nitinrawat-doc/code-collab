const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const historyController = require('../controllers/history.controller');

router.use(authenticate);
router.get('/room/:roomCode', historyController.listVersions);
router.get('/room/:roomCode/:versionId', historyController.getVersion);
router.post('/room/:roomCode/:versionId/restore', historyController.restoreVersion);
router.delete('/room/:roomCode/:versionId', historyController.deleteVersion);

module.exports = router;
