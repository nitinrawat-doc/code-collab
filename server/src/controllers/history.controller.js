/**
 * controllers/history.controller.js
 */
const historyService = require('../services/history.service');

const listVersions = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const data = await historyService.listVersions(req.params.roomCode, req.user._id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

const getVersion = async (req, res, next) => {
  try {
    const version = await historyService.getVersion(
      req.params.roomCode,
      req.params.versionId,
      req.user._id
    );
    res.json({ success: true, version });
  } catch (err) { next(err); }
};

const restoreVersion = async (req, res, next) => {
  try {
    const { session, version } = await historyService.restoreVersion(
      req.params.roomCode,
      req.params.versionId,
      req.user._id
    );
    res.json({ success: true, session, restoredFrom: version });
  } catch (err) { next(err); }
};

module.exports = { listVersions, getVersion, restoreVersion };
