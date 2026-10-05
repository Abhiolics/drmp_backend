const PaymentMethod = require('../models/PaymentMethod');
const Setting = require('../models/Setting');

// Helper to keep singleton Setting document synchronized with active payment methods
const syncSettings = async () => {
  const settings = await Setting.getSettings();

  const activeUpi = await PaymentMethod.findOne({ type: 'upi', enabled: true }).sort({
    updatedAt: -1,
    createdAt: -1,
  });

  const activeBank = await PaymentMethod.findOne({ type: 'bank', enabled: true }).sort({
    updatedAt: -1,
    createdAt: -1,
  });

  if (activeUpi) {
    if (!settings.paymentMethods.qrCode) settings.paymentMethods.qrCode = {};
    if (!settings.paymentMethods.bankAccount) settings.paymentMethods.bankAccount = {};

    settings.paymentMethods.qrCode.upiId = activeUpi.upiId;
    settings.paymentMethods.bankAccount.upiId = activeUpi.upiId;
    if (activeUpi.qrCodeUrl) {
      settings.paymentMethods.qrCode.imageUrl = activeUpi.qrCodeUrl;
    }
  }

  if (activeBank) {
    if (!settings.paymentMethods.bankAccount) settings.paymentMethods.bankAccount = {};

    settings.paymentMethods.bankAccount.accountHolder = activeBank.accountHolderName;
    settings.paymentMethods.bankAccount.bankName = activeBank.bankName;
    settings.paymentMethods.bankAccount.accountNumber = activeBank.accountNumber;
    settings.paymentMethods.bankAccount.ifscCode = activeBank.ifscCode;
  }

  await settings.save();
  return settings;
};

// Seed PaymentMethod collection from legacy Settings if collection is empty
const ensureInitialMethods = async (settings) => {
  const count = await PaymentMethod.countDocuments();
  if (count > 0) return;

  const initialDocs = [];

  // Seed UPI if existing in settings
  const legacyUpi = settings?.paymentMethods?.qrCode?.upiId || settings?.paymentMethods?.bankAccount?.upiId;
  if (legacyUpi) {
    initialDocs.push({
      type: 'upi',
      upiId: legacyUpi,
      upiPayeeName: settings?.paymentMethods?.bankAccount?.accountHolder || 'Admin Payee',
      qrCodeUrl: settings?.paymentMethods?.qrCode?.imageUrl || '',
      enabled: settings?.paymentMethods?.qrCode?.enabled ?? true,
    });
  }

  // Seed Bank if existing in settings
  const legacyBankAcc = settings?.paymentMethods?.bankAccount?.accountNumber;
  if (legacyBankAcc) {
    initialDocs.push({
      type: 'bank',
      accountHolderName: settings?.paymentMethods?.bankAccount?.accountHolder || 'Admin Payee',
      bankName: settings?.paymentMethods?.bankAccount?.bankName || 'Primary Bank',
      accountNumber: legacyBankAcc,
      ifscCode: settings?.paymentMethods?.bankAccount?.ifscCode || '',
      enabled: settings?.paymentMethods?.bankAccount?.enabled ?? true,
    });
  }

  if (initialDocs.length > 0) {
    await PaymentMethod.insertMany(initialDocs);
  }
};

// @desc    Get all payment methods for Admin panel
// @route   GET /api/payment/admin/payment-methods or /api/admin/payment-methods
// @access  Private/Admin
exports.getPaymentMethodsAdmin = async (req, res, next) => {
  try {
    const settings = await Setting.getSettings();
    await ensureInitialMethods(settings);

    const methods = await PaymentMethod.find().sort({ createdAt: -1 });

    const isUpiEnabled = settings.isUpiEnabled ?? settings.paymentMethods?.qrCode?.enabled ?? true;
    const isBankEnabled = settings.isBankEnabled ?? settings.paymentMethods?.bankAccount?.enabled ?? true;

    res.status(200).json({
      success: true,
      data: {
        isUpiEnabled,
        isBankEnabled,
        paymentMethods: methods,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new UPI or Bank Account payment method
// @route   POST /api/payment/admin/payment-methods or /api/admin/payment-methods
// @access  Private/Admin
exports.addPaymentMethod = async (req, res, next) => {
  try {
    const {
      type,
      upiId,
      upiPayeeName,
      payeeName,
      accountHolderName,
      accountHolder,
      bankName,
      accountNumber,
      ifscCode,
      ifsc,
      qrCodeUrl,
      enabled,
    } = req.body;

    if (!type || !['upi', 'bank'].includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing 'type'. Must be either 'upi' or 'bank'.",
      });
    }

    const normalizedType = type.toLowerCase();
    const isEnabled = enabled !== undefined ? enabled === true || enabled === 'true' : true;

    let newMethod;

    if (normalizedType === 'upi') {
      const finalUpi = (upiId || '').trim();
      const finalPayee = (upiPayeeName || payeeName || accountHolderName || accountHolder || '').trim();

      if (!finalUpi) {
        return res.status(400).json({
          success: false,
          message: 'UPI ID is required for UPI payment method',
        });
      }

      newMethod = await PaymentMethod.create({
        type: 'upi',
        upiId: finalUpi,
        upiPayeeName: finalPayee || 'Admin Payee',
        qrCodeUrl: (qrCodeUrl || '').trim(),
        enabled: isEnabled,
      });
    } else {
      const finalHolder = (accountHolderName || accountHolder || '').trim();
      const finalBank = (bankName || '').trim();
      const finalAccNum = (accountNumber || '').trim();
      const finalIfsc = (ifscCode || ifsc || '').trim().toUpperCase();

      if (!finalHolder || !finalBank || !finalAccNum || !finalIfsc) {
        return res.status(400).json({
          success: false,
          message: 'Account holder name, bank name, account number, and IFSC code are all required for bank payment method',
        });
      }

      newMethod = await PaymentMethod.create({
        type: 'bank',
        accountHolderName: finalHolder,
        bankName: finalBank,
        accountNumber: finalAccNum,
        ifscCode: finalIfsc,
        enabled: isEnabled,
      });
    }

    // Sync latest active methods into Setting singleton
    await syncSettings();

    res.status(201).json({
      success: true,
      message: `${normalizedType.toUpperCase()} payment method added successfully`,
      data: newMethod,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing payment method
// @route   PUT /api/payment/admin/payment-methods/:id or /api/admin/payment-methods/:id
// @access  Private/Admin
exports.updatePaymentMethod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findById(id);

    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found',
      });
    }

    const {
      upiId,
      upiPayeeName,
      payeeName,
      accountHolderName,
      accountHolder,
      bankName,
      accountNumber,
      ifscCode,
      ifsc,
      qrCodeUrl,
      enabled,
    } = req.body;

    if (method.type === 'upi') {
      if (upiId !== undefined) method.upiId = upiId.trim();
      if (upiPayeeName !== undefined || payeeName !== undefined) {
        method.upiPayeeName = (upiPayeeName || payeeName).trim();
      }
      if (qrCodeUrl !== undefined) method.qrCodeUrl = qrCodeUrl.trim();
    } else if (method.type === 'bank') {
      if (accountHolderName !== undefined || accountHolder !== undefined) {
        method.accountHolderName = (accountHolderName || accountHolder).trim();
      }
      if (bankName !== undefined) method.bankName = bankName.trim();
      if (accountNumber !== undefined) method.accountNumber = accountNumber.trim();
      if (ifscCode !== undefined || ifsc !== undefined) {
        method.ifscCode = (ifscCode || ifsc).trim().toUpperCase();
      }
    }

    if (enabled !== undefined) {
      method.enabled = enabled === true || enabled === 'true';
    }

    await method.save();
    await syncSettings();

    res.status(200).json({
      success: true,
      message: 'Payment method updated successfully',
      data: method,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a payment method
// @route   DELETE /api/payment/admin/payment-methods/:id or /api/admin/payment-methods/:id
// @access  Private/Admin
exports.deletePaymentMethod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const method = await PaymentMethod.findById(id);

    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Payment method not found',
      });
    }

    await PaymentMethod.findByIdAndDelete(id);
    await syncSettings();

    res.status(200).json({
      success: true,
      message: 'Payment method deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle global enabled state for UPI or Bank methods
// @route   PUT /api/payment/admin/payment-methods/enable or /api/admin/payment-methods/enable
// @access  Private/Admin
exports.enablePaymentMethod = async (req, res, next) => {
  try {
    const { type, enabled } = req.body;

    if (!type || !['upi', 'bank'].includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing 'type'. Must be either 'upi' or 'bank'.",
      });
    }

    const isEnabled = enabled === true || enabled === 'true' || enabled === 1 || enabled === '1';
    const settings = await Setting.getSettings();

    if (type.toLowerCase() === 'upi') {
      settings.isUpiEnabled = isEnabled;
      if (!settings.paymentMethods.qrCode) settings.paymentMethods.qrCode = {};
      settings.paymentMethods.qrCode.enabled = isEnabled;
    } else {
      settings.isBankEnabled = isEnabled;
      if (!settings.paymentMethods.bankAccount) settings.paymentMethods.bankAccount = {};
      settings.paymentMethods.bankAccount.enabled = isEnabled;
    }

    await settings.save();

    res.status(200).json({
      success: true,
      message: `${type.toUpperCase()} payment methods ${isEnabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        type: type.toLowerCase(),
        enabled: isEnabled,
        isUpiEnabled: settings.isUpiEnabled,
        isBankEnabled: settings.isBankEnabled,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active payment methods for mobile clients and public apps
// @route   GET /api/payment/payment-methods or /api/payment-methods
// @access  Public
exports.getPaymentMethodsPublic = async (req, res, next) => {
  try {
    const settings = await Setting.getSettings();
    await ensureInitialMethods(settings);

    const activeUpi = await PaymentMethod.findOne({ type: 'upi', enabled: true }).sort({
      updatedAt: -1,
      createdAt: -1,
    });

    const activeBank = await PaymentMethod.findOne({ type: 'bank', enabled: true }).sort({
      updatedAt: -1,
      createdAt: -1,
    });

    const isUpiEnabled = settings.isUpiEnabled ?? settings.paymentMethods?.qrCode?.enabled ?? true;
    const isBankEnabled = settings.isBankEnabled ?? settings.paymentMethods?.bankAccount?.enabled ?? true;

    const upiId = activeUpi?.upiId || settings.paymentMethods?.qrCode?.upiId || settings.paymentMethods?.bankAccount?.upiId || '';

    const publicData = {
      qrCode: {
        enabled: isUpiEnabled,
        imageUrl: activeUpi?.qrCodeUrl || settings.paymentMethods?.qrCode?.imageUrl || '',
        upiId,
      },
      bankAccount: {
        enabled: isBankEnabled,
        accountHolder: activeBank?.accountHolderName || settings.paymentMethods?.bankAccount?.accountHolder || '',
        bankName: activeBank?.bankName || settings.paymentMethods?.bankAccount?.bankName || '',
        accountNumber: activeBank?.accountNumber || settings.paymentMethods?.bankAccount?.accountNumber || '',
        ifscCode: activeBank?.ifscCode || settings.paymentMethods?.bankAccount?.ifscCode || '',
        upiId,
      },
    };

    res.status(200).json({
      success: true,
      data: publicData,
    });
  } catch (error) {
    next(error);
  }
};
