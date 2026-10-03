const mongoose = require('mongoose');

const giftCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Please add a gift code'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    rewardAmount: {
      type: Number,
      required: [true, 'Please add a reward amount'],
      min: [0, 'Reward amount cannot be negative'],
    },
    maxUsers: {
      type: Number,
      default: 100,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    expiryDate: {
      type: Date,
      required: [true, 'Please add an expiry date'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GiftCode', giftCodeSchema);
