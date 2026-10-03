const Deposit = require('../models/Deposit');
const User = require('../models/User');
const { adjustWalletBalance, pushNotification } = require('../utils/walletHelper');

// @desc    Create Deposit (User)
// @route   POST /api/deposits or /deposits
// @access  Private
exports.createDeposit = async (req, res, next) => {
  try {
    const { planId, transactionRef, amount } = req.body;

    if (!transactionRef || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide transaction reference and amount',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload payment proof image',
      });
    }

    // Cloudinary returns the full public URL in req.file.path
    const proofUrl = req.file.path;

    const deposit = await Deposit.create({
      user: req.user.id,
      plan: planId || null,
      transactionRef,
      amount: Number(amount),
      paymentProof: proofUrl,
      status: 'pending',
    });

    await pushNotification({
      userId: req.user.id,
      title: 'Deposit Submitted',
      message: `Your deposit of ₹${amount} (Ref: ${transactionRef}) has been submitted for admin verification.`,
      type: 'deposit',
    });

    res.status(201).json({
      success: true,
      message: 'Deposit request submitted successfully',
      data: deposit,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's deposits
// @route   GET /api/deposits or /deposits
// @access  Private
exports.getUserDeposits = async (req, res, next) => {
  try {
    const deposits = await Deposit.find({ user: req.user.id })
      .populate('plan', 'name amount')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: deposits.length,
      data: deposits,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all deposits (Admin)
// @route   GET /api/deposits/admin or /deposits/admin
// @access  Private/Admin
exports.getAllDepositsAdmin = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const total = await Deposit.countDocuments(query);
    const deposits = await Deposit.find(query)
      .populate('user', 'fullName email phoneNumber')
      .populate('plan', 'name amount')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: deposits.length,
      total,
      data: deposits,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin approve deposit
// @route   PUT /api/deposits/admin/:id/approve or /deposits/admin/:id/approve
// @access  Private/Admin
exports.approveDeposit = async (req, res, next) => {
  try {
    const deposit = await Deposit.findById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Deposit not found' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Deposit is already ${deposit.status}`,
      });
    }

    deposit.status = 'approved';
    deposit.reviewedBy = req.user.id;
    deposit.reviewedAt = new Date();
    if (req.body.reason) {
      deposit.reason = req.body.reason;
    }
    await deposit.save();

    // If a plan was selected, activate it for the user
    if (deposit.plan) {
      await User.findByIdAndUpdate(deposit.user, {
        plan: deposit.plan,
        planActivatedAt: new Date(),
      });
    }

    // Credit user's wallet with deposit amount
    await adjustWalletBalance({
      userId: deposit.user,
      amount: deposit.amount,
      type: 'credit',
      category: 'deposit',
      description: `Deposit approved (Ref: ${deposit.transactionRef})`,
      referenceId: deposit._id,
    });

    await pushNotification({
      userId: deposit.user,
      title: 'Deposit Approved',
      message: `Your deposit of ₹${deposit.amount} has been approved and credited to your wallet.`,
      type: 'success',
    });

    res.status(200).json({
      success: true,
      message: 'Deposit approved successfully',
      data: deposit,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin reject deposit
// @route   PUT /api/deposits/admin/:id/reject or /deposits/admin/:id/reject
// @access  Private/Admin
exports.rejectDeposit = async (req, res, next) => {
  try {
    const deposit = await Deposit.findById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ success: false, message: 'Deposit not found' });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Deposit is already ${deposit.status}`,
      });
    }

    deposit.status = 'rejected';
    deposit.reviewedBy = req.user.id;
    deposit.reviewedAt = new Date();
    deposit.reason = req.body.reason || 'Deposit payment proof could not be verified';
    await deposit.save();

    await pushNotification({
      userId: deposit.user,
      title: 'Deposit Rejected',
      message: `Your deposit of ₹${deposit.amount} was rejected. Reason: ${deposit.reason}`,
      type: 'warning',
    });

    res.status(200).json({
      success: true,
      message: 'Deposit rejected successfully',
      data: deposit,
    });
  } catch (error) {
    next(error);
  }
};
