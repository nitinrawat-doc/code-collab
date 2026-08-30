/**
 * services/history.service.js
 * Manages code version snapshots.
 */
const CodeVersion = require('../models/CodeVersion');
const CodingSession = require('../models/CodingSession');
const Room = require('../models/Room');
const ApiError = require('../utils/ApiError');

const MAX_VERSIONS_PER_SESSION = 50;

const EXT_LANG_MAP = {
  js: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript',
  py: 'python',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp', c: 'cpp', h: 'cpp', hpp: 'cpp',
  java: 'java',
  html: 'html', css: 'css', json: 'json', md: 'markdown', txt: 'plaintext', sh: 'shell'
};

const getLanguageFromFileName = (fileName = '') => {
  if (!fileName) return 'javascript';
  const parts = fileName.split('.');
  if (parts.length < 2) return 'javascript';
  const ext = parts.pop().toLowerCase();
  return EXT_LANG_MAP[ext] || 'javascript';
};

/**
 * Saves a new code version snapshot.
 */
const saveVersion = async (roomCode, userId, label = null) => {
  if (!roomCode || typeof roomCode !== 'string') throw ApiError.badRequest('Room code is required');
  const normalizedCode = roomCode.trim().toUpperCase();
  const room = await Room.findOne({ roomCode: normalizedCode });
  if (!room) throw ApiError.notFound('Room not found');
  if (!room.isMember(userId)) throw ApiError.forbidden('Not a member');

  const session = await CodingSession.findOne({ room: room._id });
  if (!session) throw ApiError.notFound('Session not found');

  const targetLang = label ? getLanguageFromFileName(label) : (session.language || 'javascript');

  const version = await CodeVersion.create({
    session: session._id,
    room: room._id,
    code: session.currentCode || '',
    language: targetLang,
    savedBy: userId,
    label,
  });

  // Prune old versions to keep only MAX_VERSIONS_PER_SESSION
  const count = await CodeVersion.countDocuments({ session: session._id });
  if (count > MAX_VERSIONS_PER_SESSION) {
    const oldest = await CodeVersion.find({ session: session._id })
      .sort({ createdAt: 1 })
      .limit(count - MAX_VERSIONS_PER_SESSION)
      .select('_id');
    await CodeVersion.deleteMany({ _id: { $in: oldest.map((v) => v._id) } });
  }

  return version;
};

/**
 * Lists code versions for a room (newest first, paginated).
 */
const listVersions = async (roomCode, userId, { page = 1, limit = 20 } = {}) => {
  if (!roomCode || typeof roomCode !== 'string') throw ApiError.badRequest('Room code is required');
  const normalizedCode = roomCode.trim().toUpperCase();
  const room = await Room.findOne({ roomCode: normalizedCode });
  if (!room) throw ApiError.notFound('Room not found');
  if (!room.isMember(userId)) throw ApiError.forbidden('Not a member');

  const versions = await CodeVersion.find({ room: room._id })
    .populate('savedBy', 'name avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await CodeVersion.countDocuments({ room: room._id });

  return { versions, total, page, limit };
};

/**
 * Gets a single version.
 */
const getVersion = async (roomCode, versionId, userId) => {
  if (!roomCode || typeof roomCode !== 'string') throw ApiError.badRequest('Room code is required');
  const normalizedCode = roomCode.trim().toUpperCase();
  const room = await Room.findOne({ roomCode: normalizedCode });
  if (!room) throw ApiError.notFound('Room not found');
  if (!room.isMember(userId)) throw ApiError.forbidden('Not a member');

  const version = await CodeVersion.findOne({ _id: versionId, room: room._id }).populate('savedBy', 'name avatar');
  if (!version) throw ApiError.notFound('Version not found');
  return version;
};

/**
 * Restores a previous version to the current session.
 */
const restoreVersion = async (roomCode, versionId, userId) => {
  if (!roomCode || typeof roomCode !== 'string') throw ApiError.badRequest('Room code is required');
  const normalizedCode = roomCode.trim().toUpperCase();
  const room = await Room.findOne({ roomCode: normalizedCode });
  if (!room) throw ApiError.notFound('Room not found');
  if (!room.isMember(userId)) throw ApiError.forbidden('Not a member');

  const version = await CodeVersion.findOne({ _id: versionId, room: room._id });
  if (!version) throw ApiError.notFound('Version not found');

  const session = await CodingSession.findOne({ room: room._id });
  session.currentCode = version.code;
  session.language = version.language;
  session.version += 1;
  await session.save();

  return { session, version };
};

/**
 * Deletes a single version snapshot.
 */
const deleteVersion = async (roomCode, versionId, userId) => {
  if (!roomCode || typeof roomCode !== 'string') throw ApiError.badRequest('Room code is required');
  const normalizedCode = roomCode.trim().toUpperCase();
  const room = await Room.findOne({ roomCode: normalizedCode });
  if (!room) throw ApiError.notFound('Room not found');
  if (!room.isMember(userId)) throw ApiError.forbidden('Not a member');

  const version = await CodeVersion.findOneAndDelete({ _id: versionId, room: room._id });
  if (!version) throw ApiError.notFound('Version snapshot not found');

  return { success: true, deletedId: versionId };
};

module.exports = { saveVersion, listVersions, getVersion, restoreVersion, deleteVersion };
