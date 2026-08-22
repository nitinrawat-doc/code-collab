/**
 * controllers/execute.controller.js
 */
const executionService = require('../services/execution.service');
const Room = require('../models/Room');
const Problem = require('../models/Problem');
const ApiError = require('../utils/ApiError');

const executeCode = async (req, res, next) => {
  try {
    const { roomCode, code, language, problemSlug } = req.body;
    const userId = req.user._id;

    // Validate room membership
    const room = await Room.findOne({ roomCode });
    if (!room) return next(ApiError.notFound('Room not found'));
    if (!room.isMember(userId)) return next(ApiError.forbidden('Not a member of this room'));

    let testCases = [];
    if (problemSlug) {
      const problem = await Problem.findOne({ slug: problemSlug });
      if (problem) testCases = problem.testCases;
    }

    // If no test cases (no problem selected), run with empty stdin
    if (testCases.length === 0) {
      const result = await executionService.runSingle({ code, language, stdin: '', expectedOutput: '' });
      return res.json({ success: true, mode: 'run', result });
    }

    const { results, allPassed, overallStatus } = await executionService.runAgainstTestCases({
      code,
      language,
      testCases,
    });

    res.json({ success: true, mode: 'test', results, allPassed, overallStatus });
  } catch (err) {
    next(err);
  }
};

module.exports = { executeCode };
