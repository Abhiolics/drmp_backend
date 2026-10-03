const GiftCode = require('../models/GiftCode');
const { adjustWalletBalance, pushNotification } = require('../utils/walletHelper');

// @desc    Get all gift codes (Admin)
// @route   GET /api/gift-codes/admin or /gift-codes/admin
// @access  Private/Admin
exports.getAllGiftCodesAdmin = async (req, res, next) => {
  try {
    const giftCodes = await GiftCode.find()
      .populate('usedBy.user', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: giftCodes.length,
      data: giftCodes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create gift code
// @route   POST /api/gift-codes/admin or /gift-codes/admin
// @access  Private/Admin
exports.createGiftCode = async (req, res, next) => {
  try {
    const { code, rewardAmount, maxUsers, expiryDate } = req.body;

    if (!code || rewardAmount === undefined || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide code, rewardAmount, and expiryDate',
      });
    }

    const existingCode = await GiftCode.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: 'Gift code already exists with this name',
      });
    }

    const giftCode = await GiftCode.create({
      code: code.toUpperCase(),
      rewardAmount,
      maxUsers: maxUsers || 100,
      expiryDate,
    });

    res.status(201).json({
      success: true,
      message: 'Gift code created successfully',
      data: giftCode,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update gift code
// @route   PUT /api/gift-codes/admin/:id or /gift-codes/admin/:id
// @access  Private/Admin
exports.updateGiftCode = async (req, res, next) => {
  try {
    let giftCode = await GiftCode.findById(req.params.id);

    if (!giftCode) {
      return res.status(404).json({ success: false, message: 'Gift code not found' });
    }

    if (req.body.code) {
      req.body.code = req.body.code.toUpperCase();
    }

    giftCode = await GiftCode.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Gift code updated successfully',
      data: giftCode,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete gift code
// @route   DELETE /api/gift-codes/admin/:id or /gift-codes/admin/:id
// @access  Private/Admin
exports.deleteGiftCode = async (req, res, next) => {
  try {
    const giftCode = await GiftCode.findById(req.params.id);

    if (!giftCode) {
      return res.status(404).json({ success: false, message: 'Gift code not found' });
    }

    await giftCode.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Gift code deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle gift code active status
// @route   PATCH /api/gift-codes/admin/:id/toggle or /gift-codes/admin/:id/toggle
// @access  Private/Admin
exports.toggleGiftCode = async (req, res, next) => {
  try {
    const giftCode = await GiftCode.findById(req.params.id);

    if (!giftCode) {
      return res.status(404).json({ success: false, message: 'Gift code not found' });
    }

    giftCode.isActive = !giftCode.isActive;
    await giftCode.save();

    res.status(200).json({
      success: true,
      message: `Gift code ${giftCode.isActive ? 'activated' : 'deactivated'} successfully`,
      data: giftCode,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Redeem gift code
// @route   POST /api/gift-codes/redeem or /gift-codes/redeem
// @access  Private
exports.redeemGiftCode = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a gift code',
      });
    }

    const giftCode = await GiftCode.findOne({ code: code.toUpperCase() });

    if (!giftCode) {
      return res.status(404).json({
        success: false,
        message: 'Invalid gift code',
      });
    }

    if (!giftCode.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This gift code is no longer active',
      });
    }

    if (new Date() > new Date(giftCode.expiryDate)) {
      return res.status(400).json({
        success: false,
        message: 'This gift code has expired',
      });
    }

    if (giftCode.usedCount >= giftCode.maxUsers) {
      return res.status(400).json({
        success: false,
        message: 'This gift code has reached its maximum usage limit',
      });
    }

    // Check if user already redeemed
    const alreadyUsed = giftCode.usedBy.some(
      (usage) => usage.user.toString() === req.user.id
    );

    if (alreadyUsed) {
      return res.status(400).json({
        success: false,
        message: 'You have already redeemed this gift code',
      });
    }

    // Add user to usedBy
    giftCode.usedBy.push({ user: req.user.id, usedAt: new Date() });
    giftCode.usedCount += 1;
    await giftCode.save();

    // Credit user's wallet
    await adjustWalletBalance({
      userId: req.user.id,
      amount: giftCode.rewardAmount,
      type: 'credit',
      category: 'gift_code',
      description: `Redeemed gift code: ${giftCode.code}`,
      referenceId: giftCode._id,
    });

    await pushNotification({
      userId: req.user.id,
      title: 'Gift Code Redeemed',
      message: `You received ₹${giftCode.rewardAmount} from gift code ${giftCode.code}`,
      type: 'success',
    });

    res.status(200).json({
      success: true,
      message: `Successfully redeemed ₹${giftCode.rewardAmount}!`,
      data: {
        code: giftCode.code,
        rewardAmount: giftCode.rewardAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};
