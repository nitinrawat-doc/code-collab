const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

router.use(authenticate);

// GET /api/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return next(ApiError.notFound('User not found'));
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

// PATCH /api/users/me — update own name/avatar
router.patch('/me', async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (avatar) updates.avatar = avatar;
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

module.exports = router;
