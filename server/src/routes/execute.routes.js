const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { executionLimiter } = require('../middleware/rateLimiter');
const executeController = require('../controllers/execute.controller');

const executeSchema = Joi.object({
  roomCode: Joi.string().required(),
  code: Joi.string().required(),
  language: Joi.string().valid('javascript', 'python', 'cpp', 'java').required(),
  problemSlug: Joi.string().allow(null, '').optional(),
});

router.use(authenticate);
router.post('/', executionLimiter, validate(executeSchema), executeController.executeCode);
module.exports = router;
