const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { adjustWalletBalance, pushNotification } = require('../utils/walletHelper');

// @desc    Get user wallet
// @route   GET /api/wallet or /wallet
// @access  Private
exports.getWallet = async (req, res, next) => {
  try {
    let wallet = await Wallet.findOne({ user: req.user.id });

    if (!wallet) {
      wallet = await Wallet.create({ user: req.user.id, balance: 0 });
    }

    res.status(200).json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user transactions
// @route   GET /api/wallet/transactions or /wallet/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, category } = req.query;
    const query = { user: req.user.id };

    if (type) query.type = type;
    if (category) query.category = category;

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin adjust wallet
// @route   POST /api/wallet/admin/adjust or /wallet/admin/adjust
// @access  Private/Admin
exports.adminAdjustWallet = async (req, res, next) => {
  try {
    const { userId, amount, type, description } = req.body;

    if (!userId || amount === undefined || !type) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId, amount, and type (credit or debit)',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    const numericAmount = Number(amount);
    if (numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    const { wallet, transaction } = await adjustWalletBalance({
      userId,
      amount: numericAmount,
      type,
      category: 'admin_adjustment',
      description: description || `Admin ${type} adjustment`,
    });

    await pushNotification({
      userId,
      title: `Wallet ${type === 'credit' ? 'Credited' : 'Debited'}`,
      message: `Your wallet was ${type === 'credit' ? 'credited with' : 'debited by'} ₹${numericAmount}. Reason: ${description || 'Admin adjustment'}`,
      type: type === 'credit' ? 'success' : 'info',
    });

    res.status(200).json({
      success: true,
      message: `Wallet ${type === 'credit' ? 'credited' : 'debited'} successfully`,
      data: {
        wallet,
        transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};
