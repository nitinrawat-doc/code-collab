/**
 * models/RoomInvite.js
 *
 * Stores a single-use invite token linked to a room.
 * Token is a 32-byte cryptographically random hex string (64 chars).
 * Expires after 7 days by default.
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

const roomInviteSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    // roomCode stored directly so we can look up without joining Room
    roomCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    usedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        usedAt: { type: Date, default: Date.now },
      },
    ],
    // Max number of uses (null = unlimited)
    maxUses: {
      type: Number,
      default: null,
    },
    // Soft-revoke by owner
    revoked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// TTL index: MongoDB automatically removes expired documents
roomInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Note: token has unique:true above which already creates an index — no duplicate needed
roomInviteSchema.index({ room: 1 });

/**
 * Check if this invite is currently valid (not expired, not revoked, not full).
 */
roomInviteSchema.methods.isValid = function () {
  if (this.revoked) return false;
  if (new Date() > this.expiresAt) return false;
  if (this.maxUses !== null && this.usedBy.length >= this.maxUses) return false;
  return true;
};

/**
 * Check if a specific user has already used this invite.
 */
roomInviteSchema.methods.usedByUser = function (userId) {
  return this.usedBy.some((u) => u.user.toString() === userId.toString());
};

module.exports = mongoose.model('RoomInvite', roomInviteSchema);
