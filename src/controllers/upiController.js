const Upi = require('../models/Upi');
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');

// @desc    Get logged in user's UPI addresses
// @route   GET /api/upi/my
// @access  Private
exports.getMyUpi = async (req, res, next) => {
  try {
    const upis = await Upi.find({ userId: req.user._id }).sort({ isPrimary: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: upis.length,
      data: upis,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user UPI address
// @route   POST /api/upi
// @access  Private
exports.createUpi = async (req, res, next) => {
  try {
    const { upiId, accountHolderName, isPrimary } = req.body;

    if (!upiId || !accountHolderName) {
      return res.status(400).json({
        success: false,
        message: 'UPI ID and Account Holder Name are required',
      });
    }

    if (isPrimary) {
      await Upi.updateMany({ userId: req.user._id }, { isPrimary: false });
    }

    const cleanUpi = upiId.trim();
    const upi = await Upi.create({
      userId: req.user._id,
      upiId: cleanUpi,
      accountHolderName: accountHolderName.trim(),
      isPrimary: isPrimary || false,
    });

    // Sync upiId to User document directly for immediate admin panel visibility
    await User.findByIdAndUpdate(req.user._id, {
      upiId: cleanUpi,
    });

    res.status(201).json({
      success: true,
      message: 'UPI address registered successfully',
      data: upi,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user UPI address
// @route   PUT /api/upi/:id
// @access  Private
exports.updateUpi = async (req, res, next) => {
  try {
    const { id } = req.params;
    const upi = await Upi.findOne({ _id: id, userId: req.user._id });

    if (!upi) {
      return res.status(404).json({
        success: false,
        message: 'UPI record not found',
      });
    }

    const { upiId, accountHolderName, isPrimary } = req.body;

    if (isPrimary) {
      await Upi.updateMany({ userId: req.user._id }, { isPrimary: false });
      upi.isPrimary = true;
    } else if (isPrimary === false) {
      upi.isPrimary = false;
    }

    if (upiId) upi.upiId = upiId.trim();
    if (accountHolderName) upi.accountHolderName = accountHolderName.trim();

    await upi.save();

    // Sync upiId to User document directly
    await User.findByIdAndUpdate(req.user._id, {
      upiId: upi.upiId,
    });

    res.status(200).json({
      success: true,
      message: 'UPI address updated successfully',
      data: upi,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user UPI address
// @route   DELETE /api/upi/:id
// @access  Private
exports.deleteUpi = async (req, res, next) => {
  try {
    const { id } = req.params;
    const upi = await Upi.findOneAndDelete({ _id: id, userId: req.user._id });

    if (!upi) {
      return res.status(404).json({
        success: false,
        message: 'UPI record not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'UPI address removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all registered UPI accounts (Admin)
// @route   GET /api/upi/admin/all
// @access  Private/Admin
exports.getAllUpisAdmin = async (req, res, next) => {
  try {
    // If UPI directory is empty, seed any historical UPIs from prior withdrawals
    const totalCount = await Upi.countDocuments();
    if (totalCount === 0) {
      try {
        const historicalWithdrawals = await Withdrawal.find({
          'bankDetails.upiId': { $exists: true, $ne: '' },
        }).sort({ createdAt: -1 });

        const seenHandles = new Set();
        for (const w of historicalWithdrawals) {
          const rawUpi = (w.bankDetails?.upiId || '').trim();
          if (rawUpi && !seenHandles.has(rawUpi) && w.user) {
            seenHandles.add(rawUpi);
            await Upi.create({
              userId: w.user,
              upiId: rawUpi,
              accountHolderName: w.bankDetails.accountHolderName || 'Platform User',
              isPrimary: false,
            });
          }
        }
      } catch (_) {}
    }

    const upis = await Upi.find()
      .populate('userId', 'fullName email phoneNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: upis.length,
      data: upis,
    });
  } catch (error) {
    next(error);
  }
};
