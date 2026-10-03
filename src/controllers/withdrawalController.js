const Withdrawal = require('../models/Withdrawal');
const { adjustWalletBalance, pushNotification } = require('../utils/walletHelper');

// @desc    Create Withdrawal Request (User)
// @route   POST /api/withdrawals or /withdrawals
// @access  Private
exports.createWithdrawal = async (req, res, next) => {
  try {
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid withdrawal amount',
      });
    }

    if (!bankDetails) {
      return res.status(400).json({
        success: false,
        message: 'Please provide bank or UPI details',
      });
    }

    // Debit amount from user's wallet immediately to prevent overdraft
    let walletAdjustment;
    try {
      walletAdjustment = await adjustWalletBalance({
        userId: req.user.id,
        amount: Number(amount),
        type: 'debit',
        category: 'withdrawal',
        description: `Withdrawal request initiated`,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    const withdrawal = await Withdrawal.create({
      user: req.user.id,
      amount: Number(amount),
      bankDetails,
      status: 'pending',
    });

    // Update transaction referenceId
    walletAdjustment.transaction.referenceId = withdrawal._id;
    await walletAdjustment.transaction.save();

    await pushNotification({
      userId: req.user.id,
      title: 'Withdrawal Requested',
      message: `Your withdrawal request for ₹${amount} has been received and is being processed.`,
      type: 'withdrawal',
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: withdrawal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user withdrawals
// @route   GET /api/withdrawals or /withdrawals
// @access  Private
exports.getUserWithdrawals = async (req, res, next) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: withdrawals.length,
      data: withdrawals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all withdrawals (Admin)
// @route   GET /api/withdrawals/admin or /withdrawals/admin
// @access  Private/Admin
exports.getAllWithdrawalsAdmin = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const total = await Withdrawal.countDocuments(query);
    const withdrawals = await Withdrawal.find(query)
      .populate('user', 'fullName email phoneNumber')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: withdrawals.length,
      total,
      data: withdrawals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve withdrawal (Admin)
// @route   PUT /api/withdrawals/admin/:id/approve or /withdrawals/admin/:id/approve
// @access  Private/Admin
exports.approveWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal is already ${withdrawal.status}`,
      });
    }

    withdrawal.status = 'approved';
    withdrawal.reviewedBy = req.user.id;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();

    await pushNotification({
      userId: withdrawal.user,
      title: 'Withdrawal Approved',
      message: `Your withdrawal of ₹${withdrawal.amount} has been processed successfully.`,
      type: 'success',
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal approved successfully',
      data: withdrawal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject withdrawal (Admin)
// @route   PUT /api/withdrawals/admin/:id/reject or /withdrawals/admin/:id/reject
// @access  Private/Admin
exports.rejectWithdrawal = async (req, res, next) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ success: false, message: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Withdrawal is already ${withdrawal.status}`,
      });
    }

    withdrawal.status = 'rejected';
    withdrawal.reviewedBy = req.user.id;
    withdrawal.reviewedAt = new Date();
    withdrawal.reason = req.body.reason || 'Withdrawal rejected by administrator';
    await withdrawal.save();

    // Refund deducted amount back to user's wallet
    await adjustWalletBalance({
      userId: withdrawal.user,
      amount: withdrawal.amount,
      type: 'credit',
      category: 'withdrawal',
      description: `Withdrawal refund: ${withdrawal.reason}`,
      referenceId: withdrawal._id,
    });

    await pushNotification({
      userId: withdrawal.user,
      title: 'Withdrawal Rejected',
      message: `Your withdrawal of ₹${withdrawal.amount} was rejected and refunded to your wallet. Reason: ${withdrawal.reason}`,
      type: 'warning',
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal rejected and amount refunded to user wallet',
      data: withdrawal,
    });
  } catch (error) {
    next(error);
  }
};
