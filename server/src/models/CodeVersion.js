const mongoose = require('mongoose');

const codeVersionSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CodingSession',
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      enum: ['javascript', 'python', 'cpp', 'java'],
      required: true,
    },
    savedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    label: {
      type: String,
      default: null, // e.g. "Before Two Sum attempt" — user-defined or auto
    },
  },
  { timestamps: true }
);

// Index for efficient pagination (most recent first)
codeVersionSchema.index({ session: 1, createdAt: -1 });
codeVersionSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('CodeVersion', codeVersionSchema);
