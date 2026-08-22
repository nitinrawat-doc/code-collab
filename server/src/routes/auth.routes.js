/**
 * routes/auth.routes.js
 */
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/auth.controller');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
