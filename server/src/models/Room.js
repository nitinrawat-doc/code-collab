const mongoose = require('mongoose');
const crypto = require('crypto');

// 8-character uppercase alphanumeric room code (pure Node.js, no ESM dep)
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const generateCode = () => {
  let result = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
};

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      unique: true,
      default: generateCode,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [memberSchema],
    maxMembers: {
      type: Number,
      default: 10,
      min: 2,
      max: 20,
    },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
    currentProblem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
roomSchema.index({ owner: 1 });
roomSchema.index({ 'members.user': 1 });

// Virtual: is room full?
roomSchema.virtual('isFull').get(function () {
  return this.members.length >= this.maxMembers;
});

// Helper: check if userId is a member
// Handles both ObjectId refs and populated user objects
roomSchema.methods.isMember = function (userId) {
  const targetId = userId.toString();
  return this.members.some((m) => {
    const memberId = m.user?._id ? m.user._id.toString() : m.user.toString();
    return memberId === targetId;
  });
};

// Helper: check if userId is owner
roomSchema.methods.isOwner = function (userId) {
  const ownerId = this.owner?._id ? this.owner._id.toString() : this.owner.toString();
  return ownerId === userId.toString();
};

module.exports = mongoose.model('Room', roomSchema);
