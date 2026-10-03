const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null,
    },
    transactionRef: {
      type: String,
      required: [true, 'Please add transaction reference'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please add deposit amount'],
      min: [1, 'Amount must be greater than 0'],
    },
    paymentProof: {
      type: String,
      required: [true, 'Please upload payment proof image'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reason: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Deposit', depositSchema);
