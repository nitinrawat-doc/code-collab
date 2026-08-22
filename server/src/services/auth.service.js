/**
 * services/auth.service.js
 * Business logic for authentication — registration, login.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

/**
 * Creates a signed JWT for the given userId.
 */
const signToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Registers a new user.
 */
const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash: password, // pre-save hook will hash this
  });

  const token = signToken(user._id);
  return { user, token };
};

/**
 * Logs in an existing user.
 */
const login = async ({ email, password }) => {
  // Must select passwordHash since it's excluded by default
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw ApiError.unauthorized('Invalid email or password');

  const token = signToken(user._id);
  return { user, token };
};

module.exports = { signToken, register, login };
