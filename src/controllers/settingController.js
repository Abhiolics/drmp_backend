const Setting = require('../models/Setting');
const PaymentMethod = require('../models/PaymentMethod');
const { getPaymentMethodsPublic } = require('./paymentMethodController');

// @desc    Get public application settings (Maintenance, update control)
// @route   GET /api/app/settings or /app/settings
// @access  Public
exports.getPublicSettings = async (req, res, next) => {
  try {
    const settings = await Setting.getSettings();

    res.status(200).json({
      success: true,
      data: {
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        forceUpdate: settings.forceUpdate,
        updateMessage: settings.updateMessage,
        currentVersion: settings.currentVersion,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public active payment methods (QR code, bank details)
// @route   GET /api/payment-methods or /payment-methods
// @access  Public
exports.getPaymentMethods = getPaymentMethodsPublic;

// @desc    Get full settings (Admin)
// @route   GET /api/admin/settings or /admin/settings
// @access  Private/Admin
exports.getAdminSettings = async (req, res, next) => {
  try {
    const settings = await Setting.getSettings();

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update maintenance mode
// @route   PUT /api/admin/settings/maintenance or /admin/settings/maintenance
// @access  Private/Admin
exports.updateMaintenance = async (req, res, next) => {
  try {
    const { maintenanceMode, maintenanceMessage } = req.body;
    const settings = await Setting.getSettings();

    if (maintenanceMode !== undefined) {
      settings.maintenanceMode = maintenanceMode;
    }
    if (maintenanceMessage !== undefined) {
      settings.maintenanceMessage = maintenanceMessage;
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Maintenance settings updated successfully',
      data: {
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update app control & version
// @route   PUT /api/admin/settings/update-control or /admin/settings/update-control
// @access  Private/Admin
exports.updateControl = async (req, res, next) => {
  try {
    const { forceUpdate, updateMessage, currentVersion } = req.body;
    const settings = await Setting.getSettings();

    if (forceUpdate !== undefined) settings.forceUpdate = forceUpdate;
    if (updateMessage !== undefined) settings.updateMessage = updateMessage;
    if (currentVersion !== undefined) settings.currentVersion = currentVersion;

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Update control settings updated successfully',
      data: {
        forceUpdate: settings.forceUpdate,
        updateMessage: settings.updateMessage,
        currentVersion: settings.currentVersion,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment methods (QR code, bank details)
// @route   PUT /api/admin/settings/payment or /admin/settings/payment
// @access  Private/Admin
exports.updatePaymentMethods = async (req, res, next) => {
  try {
    const { qrCode, bankAccount } = req.body;
    const settings = await Setting.getSettings();

    if (qrCode) {
      settings.paymentMethods.qrCode = {
        ...settings.paymentMethods.qrCode,
        ...qrCode,
      };

      if (qrCode.upiId) {
        await PaymentMethod.findOneAndUpdate(
          { type: 'upi' },
          {
            type: 'upi',
            upiId: qrCode.upiId.trim(),
            qrCodeUrl: qrCode.imageUrl || '',
            enabled: qrCode.enabled !== undefined ? qrCode.enabled : true,
          },
          { upsert: true, new: true }
        );
      }
    }

    if (bankAccount) {
      settings.paymentMethods.bankAccount = {
        ...settings.paymentMethods.bankAccount,
        ...bankAccount,
      };

      if (bankAccount.accountNumber) {
        await PaymentMethod.findOneAndUpdate(
          { type: 'bank' },
          {
            type: 'bank',
            accountHolderName: bankAccount.accountHolder || 'Admin Payee',
            bankName: bankAccount.bankName || 'Bank',
            accountNumber: bankAccount.accountNumber.trim(),
            ifscCode: (bankAccount.ifscCode || '').trim().toUpperCase(),
            enabled: bankAccount.enabled !== undefined ? bankAccount.enabled : true,
          },
          { upsert: true, new: true }
        );
      }
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Payment methods updated successfully',
      data: settings.paymentMethods,
    });
  } catch (error) {
    next(error);
  }
};
