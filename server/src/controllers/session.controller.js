/**
 * controllers/session.controller.js
 */
const sessionService = require('../services/session.service');
const historyService = require('../services/history.service');

const getSession = async (req, res, next) => {
  try {
    const session = await sessionService.getSession(req.params.roomCode, req.user._id);
    res.json({ success: true, session });
  } catch (err) { next(err); }
};

const saveVersion = async (req, res, next) => {
  try {
    const version = await historyService.saveVersion(
      req.params.roomCode,
      req.user._id,
      req.body.label || null
    );
    res.status(201).json({ success: true, version });
  } catch (err) { next(err); }
};

module.exports = { getSession, saveVersion };
