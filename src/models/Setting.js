const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    maintenanceMessage: {
      type: String,
      default: 'The system is currently under maintenance. Please try again later.',
    },
    forceUpdate: {
      type: Boolean,
      default: false,
    },
    updateMessage: {
      type: String,
      default: 'A new version of the app is available. Please update to continue using the application.',
    },
    currentVersion: {
      type: String,
      default: '1.0.0',
    },
    paymentMethods: {
      qrCode: {
        enabled: { type: Boolean, default: true },
        imageUrl: { type: String, default: '' },
      },
      bankAccount: {
        enabled: { type: Boolean, default: true },
        accountHolder: { type: String, default: '' },
        bankName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
        upiId: { type: String, default: '' },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Method to get or initialize singleton settings document
settingSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Setting', settingSchema);
