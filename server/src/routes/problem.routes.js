const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const problemController = require('../controllers/problem.controller');
router.use(authenticate);
router.get('/', problemController.listProblems);
router.get('/:slug', problemController.getProblem);
module.exports = router;
