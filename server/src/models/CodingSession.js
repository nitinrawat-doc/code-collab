const mongoose = require('mongoose');

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
      enum: ['javascript', 'python', 'cpp', 'java'],
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
