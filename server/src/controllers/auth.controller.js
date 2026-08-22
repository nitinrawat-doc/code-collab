/**
 * controllers/auth.controller.js
 * Handles HTTP lifecycle for auth routes.
 * Business logic delegated to auth.service.js.
 */
const authService = require('../services/auth.service');
const { NODE_ENV } = require('../config/env');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const register = async (req, res, next) => {
  try {
    const { user, token } = await authService.register(req.body);
    res.cookie('token', token, COOKIE_OPTIONS);
    // Return token in body so client can authenticate Socket.IO
    res.status(201).json({ success: true, user, token });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { user, token } = await authService.login(req.body);
    res.cookie('token', token, COOKIE_OPTIONS);
    // Return token in body so client can authenticate Socket.IO
    res.json({ success: true, user, token });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax' });
  res.json({ success: true, message: 'Logged out successfully' });
};

const getMe = (req, res) => {
  // Re-sign a fresh token so the client can reconnect the socket after page refresh
  const token = authService.signToken(req.user._id);
  res.json({ success: true, user: req.user, token });
};

module.exports = { register, login, logout, getMe };
