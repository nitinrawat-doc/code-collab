const mongoose = require('mongoose');

const ALLOWED_LANGUAGES = [
  'javascript', 'python', 'cpp', 'java',
  'typescript', 'html', 'css', 'json', 'markdown', 'plaintext', 'shell'
];

const codingSessionSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      unique: true, // One active session per room
      index: true,
    },
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      default: null,
    },
    language: {
      type: String,
      enum: ALLOWED_LANGUAGES,
      default: 'javascript',
    },
    currentCode: {
      type: String,
      default: '// Start coding here\n',
    },
    version: {
      type: Number,
      default: 0, // Monotonic counter for conflict detection
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CodingSession', codingSessionSchema);
