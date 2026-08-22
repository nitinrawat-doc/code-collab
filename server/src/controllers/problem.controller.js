/**
 * controllers/problem.controller.js
 */
const Problem = require('../models/Problem');
const ApiError = require('../utils/ApiError');

const listProblems = async (req, res, next) => {
  try {
    const { difficulty, tag, page = 1, limit = 20, search } = req.query;
    const filter = {};
    if (difficulty) filter.difficulty = difficulty;
    if (tag) filter.tags = tag.toLowerCase();
    if (search) filter.title = { $regex: search, $options: 'i' };

    const problems = await Problem.find(filter)
      .select('slug title difficulty tags')
      .sort({ difficulty: 1, title: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Problem.countDocuments(filter);
    res.json({ success: true, problems, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
};

const getProblem = async (req, res, next) => {
  try {
    const problem = await Problem.findOne({ slug: req.params.slug });
    if (!problem) return next(ApiError.notFound('Problem not found'));
    res.json({ success: true, problem });
  } catch (err) { next(err); }
};

module.exports = { listProblems, getProblem };
