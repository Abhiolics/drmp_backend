const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const TaskSubmission = require('../models/TaskSubmission');
const Task = require('../models/Task');
const Plan = require('../models/Plan');
const Wallet = require('../models/Wallet');
const Upi = require('../models/Upi');
const Transaction = require('../models/Transaction');

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

    // Also include any standalone admin debit wallet adjustments in total withdrawals
    const linkedWithdrawalIds = await Withdrawal.find().distinct('_id');
    const unlinkedAdminDebits = await Transaction.aggregate([
      {
        $match: {
          type: 'debit',
          category: 'admin_adjustment',
          status: 'completed',
          referenceId: { $nin: linkedWithdrawalIds },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);
    const extraAdminDebits = unlinkedAdminDebits.length > 0 ? unlinkedAdminDebits[0].totalAmount : 0;
    const totalApprovedWithdrawals = Number((approvedWithdrawals + extraAdminDebits).toFixed(2));

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
          totalApprovedAmount: totalApprovedWithdrawals,
          pendingCount: pendingWithdrawals,
          approvedWithdrawalsOnly: approvedWithdrawals,
          adminDebitAdjustments: extraAdminDebits,
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

// @desc    Get all users with pagination, search, UPI details & total withdrawals
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
        { referralCode: { $regex: search, $options: 'i' } },
        { upiId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate('plan')
      .populate('wallet')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const userIds = users.map((u) => u._id);

    // Fetch UPI addresses from Upi collection
    const upis = await Upi.find({ userId: { $in: userIds } }).sort({ isPrimary: -1, createdAt: -1 });

    // Fetch withdrawals for UPI and total withdrawal computation
    const withdrawals = await Withdrawal.find({
      user: { $in: userIds },
    }).sort({ createdAt: -1 });

    // Fetch deposits for total deposit computation
    const deposits = await Deposit.find({
      user: { $in: userIds },
      status: 'approved',
    });

    // Fetch completed admin debit transactions
    const adminDebitTransactions = await Transaction.find({
      user: { $in: userIds },
      category: 'admin_adjustment',
      type: 'debit',
      status: 'completed',
    });

    // Map upis per user
    const upiMap = {};
    upis.forEach((item) => {
      const uId = item.userId.toString();
      if (!upiMap[uId]) upiMap[uId] = [];
      upiMap[uId].push(item);
    });

    // Map withdrawals per user
    const withdrawalUpiMap = {};
    const withdrawalTotalMap = {};
    withdrawals.forEach((w) => {
      const uId = w.user.toString();
      const rawUpi = (w.bankDetails?.upiId || '').trim();
      if (rawUpi && !withdrawalUpiMap[uId]) {
        withdrawalUpiMap[uId] = {
          upiId: rawUpi,
          accountHolderName: w.bankDetails?.accountHolderName || '',
        };
      }
      if (w.status === 'approved') {
        withdrawalTotalMap[uId] = (withdrawalTotalMap[uId] || 0) + Number(w.amount || 0);
      }
    });

    // Include admin debit adjustments in user's total withdrawal
    adminDebitTransactions.forEach((tx) => {
      const uId = tx.user.toString();
      const isLinked = withdrawals.some(
        (w) => w._id.toString() === (tx.referenceId ? tx.referenceId.toString() : '')
      );
      if (!isLinked) {
        withdrawalTotalMap[uId] = (withdrawalTotalMap[uId] || 0) + Number(tx.amount || 0);
      }
    });

    // Map deposits per user
    const depositTotalMap = {};
    deposits.forEach((d) => {
      const uId = d.user.toString();
      depositTotalMap[uId] = (depositTotalMap[uId] || 0) + Number(d.amount || 0);
    });

    // Format formatted user list
    const formattedUsers = users.map((u) => {
      const userObj = u.toObject ? u.toObject() : { ...u };
      const uId = userObj._id.toString();

      const userUpisList = upiMap[uId] || [];
      const primaryUpi = userUpisList.find((item) => item.isPrimary) || userUpisList[0];
      const fallbackW = withdrawalUpiMap[uId];

      const resolvedUpiId =
        (primaryUpi && primaryUpi.upiId) ||
        userObj.upiId ||
        (fallbackW && fallbackW.upiId) ||
        '';

      const resolvedHolderName =
        (primaryUpi && primaryUpi.accountHolderName) ||
        (fallbackW && fallbackW.accountHolderName) ||
        userObj.fullName ||
        '';

      return {
        ...userObj,
        upiId: resolvedUpiId,
        accountHolderName: resolvedHolderName,
        upis: userUpisList,
        totalWithdrawal: Number((withdrawalTotalMap[uId] || 0).toFixed(2)),
        totalDeposit: Number((depositTotalMap[uId] || 0).toFixed(2)),
      };
    });

    res.status(200).json({
      success: true,
      count: formattedUsers.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: formattedUsers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user details with full UPI and withdrawal summary
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

    const userId = user._id;

    // Fetch user's UPIs
    const userUpisList = await Upi.find({ userId }).sort({ isPrimary: -1, createdAt: -1 });
    const primaryUpi = userUpisList.find((item) => item.isPrimary) || userUpisList[0];

    // Fetch withdrawals & deposits
    const withdrawals = await Withdrawal.find({ user: userId }).sort({ createdAt: -1 });
    const deposits = await Deposit.find({ user: userId, status: 'approved' });
    const adminDebits = await Transaction.find({
      user: userId,
      category: 'admin_adjustment',
      type: 'debit',
      status: 'completed',
    });

    let totalWithdrawal = 0;
    let fallbackUpi = '';
    let fallbackHolderName = '';

    withdrawals.forEach((w) => {
      const rawUpi = (w.bankDetails?.upiId || '').trim();
      if (rawUpi && !fallbackUpi) {
        fallbackUpi = rawUpi;
        fallbackHolderName = w.bankDetails?.accountHolderName || '';
      }
      if (w.status === 'approved') {
        totalWithdrawal += Number(w.amount || 0);
      }
    });

    // Add unlinked admin debits to total withdrawal
    adminDebits.forEach((tx) => {
      const isLinked = withdrawals.some(
        (w) => w._id.toString() === (tx.referenceId ? tx.referenceId.toString() : '')
      );
      if (!isLinked) {
        totalWithdrawal += Number(tx.amount || 0);
      }
    });

    let totalDeposit = 0;
    deposits.forEach((d) => {
      totalDeposit += Number(d.amount || 0);
    });

    const resolvedUpiId =
      (primaryUpi && primaryUpi.upiId) ||
      user.upiId ||
      fallbackUpi ||
      '';

    const resolvedHolderName =
      (primaryUpi && primaryUpi.accountHolderName) ||
      fallbackHolderName ||
      user.fullName ||
      '';

    const userObj = user.toObject ? user.toObject() : { ...user };

    res.status(200).json({
      success: true,
      data: {
        ...userObj,
        upiId: resolvedUpiId,
        accountHolderName: resolvedHolderName,
        upis: userUpisList,
        totalWithdrawal: Number(totalWithdrawal.toFixed(2)),
        totalDeposit: Number(totalDeposit.toFixed(2)),
      },
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
