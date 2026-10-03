const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const TaskSubmission = require('../models/TaskSubmission');
const Task = require('../models/Task');
const Plan = require('../models/Plan');
const Wallet = require('../models/Wallet');

// @desc    Get Admin Dashboard Stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeUsers = await User.countDocuments({ role: 'user', isActive: true, isBlocked: false });
    const blockedUsers = await User.countDocuments({ role: 'user', isBlocked: true });

    // Deposit stats
    const depositStats = await Deposit.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let approvedDeposits = 0;
    let pendingDeposits = 0;
    depositStats.forEach((stat) => {
      if (stat._id === 'approved') approvedDeposits = stat.totalAmount;
      if (stat._id === 'pending') pendingDeposits = stat.count;
    });

    // Withdrawal stats
    const withdrawalStats = await Withdrawal.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    let approvedWithdrawals = 0;
    let pendingWithdrawals = 0;
    withdrawalStats.forEach((stat) => {
      if (stat._id === 'approved') approvedWithdrawals = stat.totalAmount;
      if (stat._id === 'pending') pendingWithdrawals = stat.count;
    });

    const pendingSubmissions = await TaskSubmission.countDocuments({ status: 'pending' });
    const totalPlans = await Plan.countDocuments();
    const totalTasks = await Task.countDocuments();

    // Total wallet balances
    const walletStats = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalWalletBalance: { $sum: '$balance' },
        },
      },
    ]);
    const totalWalletBalance = walletStats.length > 0 ? walletStats[0].totalWalletBalance : 0;

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          blocked: blockedUsers,
        },
        deposits: {
          totalApprovedAmount: approvedDeposits,
          pendingCount: pendingDeposits,
        },
        withdrawals: {
          totalApprovedAmount: approvedWithdrawals,
          pendingCount: pendingWithdrawals,
        },
        tasks: {
          totalTasks,
          pendingSubmissions,
        },
        plans: {
          totalPlans,
        },
        wallets: {
          totalWalletBalance,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users with pagination and search
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = { role: 'user' };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('plan')
      .populate('wallet')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('plan')
      .populate('wallet');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Block user
// @route   PATCH /api/admin/users/:id/block
// @access  Private/Admin
exports.blockUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User has been blocked successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unblock user
// @route   PATCH /api/admin/users/:id/unblock
// @access  Private/Admin
exports.unblockUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User has been unblocked successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate user
// @route   PATCH /api/admin/users/:id/activate
// @access  Private/Admin
exports.activateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User has been activated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate user
// @route   PATCH /api/admin/users/:id/deactivate
// @access  Private/Admin
exports.deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User has been deactivated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
