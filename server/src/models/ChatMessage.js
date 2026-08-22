const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Denormalized for fast display without population on every message fetch
    senderName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

// Index for time-sorted room messages
chatMessageSchema.index({ room: 1, createdAt: 1 });

// Optional TTL: auto-delete messages older than 30 days
// chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
