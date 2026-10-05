const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Payment method type is required (upi or bank)'],
      enum: ['upi', 'bank'],
      lowercase: true,
      trim: true,
    },
    // UPI specific fields
    upiId: {
      type: String,
      trim: true,
      default: '',
    },
    upiPayeeName: {
      type: String,
      trim: true,
      default: '',
    },
    // Bank specific fields
    accountHolderName: {
      type: String,
      trim: true,
      default: '',
    },
    bankName: {
      type: String,
      trim: true,
      default: '',
    },
    accountNumber: {
      type: String,
      trim: true,
      default: '',
    },
    ifscCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    // Optional QR code / details
    qrCodeUrl: {
      type: String,
      trim: true,
      default: '',
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field aliases for frontend compatibility
paymentMethodSchema.virtual('payeeName').get(function () {
  return this.upiPayeeName;
});

paymentMethodSchema.virtual('accountHolder').get(function () {
  return this.accountHolderName;
});

paymentMethodSchema.virtual('ifsc').get(function () {
  return this.ifscCode;
});

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
