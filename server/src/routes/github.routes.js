/**
 * routes/github.routes.js
 */

const express = require('express');
const router = express.Router();
const githubController = require('../controllers/github.controller');
const authenticate = require('../middleware/authenticate');

router.use(authenticate);

router.get('/repos', githubController.getRepos);
router.get('/branches', githubController.getBranches);
router.post('/commit-push', githubController.commitAndPush);

module.exports = router;
