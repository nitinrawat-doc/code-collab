/**
 * middleware/authenticate.js
 * Verifies JWT from HttpOnly cookie or Authorization header.
 * Attaches req.user on success.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { JWT_SECRET } = require('../config/env');

const authenticate = async (req, res, next) => {
  try {
    // 1. Try cookie first, then Authorization header
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Session expired, please login again'));
      }
      return next(ApiError.unauthorized('Invalid token'));
    }

    // 3. Fetch user (ensures user still exists)
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(ApiError.unauthorized('User no longer exists'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authenticate;
