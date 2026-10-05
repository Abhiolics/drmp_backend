const mongoose = require('mongoose');

const upiSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    upiId: {
      type: String,
      required: [true, 'UPI ID is required'],
      trim: true,
    },
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required'],
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Upi', upiSchema);
