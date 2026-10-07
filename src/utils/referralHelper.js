const crypto = require('crypto');
const User = require('../models/User');
const { adjustWalletBalance, pushNotification } = require('./walletHelper');

/**
 * Auto-generate a unique, uppercase referral code
 * e.g., DRM + 5 random alphanumeric characters (DRMA7K2P)
 * Excludes ambiguous characters (0, O, 1, I) for readability
 */
const generateUniqueReferralCode = async (prefix = 'DRM') => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let isUnique = false;
  let code = '';

  while (!isUnique) {
    let randomPart = '';
    const bytes = crypto.randomBytes(5);
    for (let i = 0; i < 5; i++) {
      randomPart += chars[bytes[i] % chars.length];
    }
    code = `${prefix}${randomPart}`.toUpperCase();

    const existingUser = await User.findOne({ referralCode: code });
    if (!existingUser) {
      isUnique = true;
    }
  }

  return code;
};

/**
 * Reusable function to distribute 2-Level referral commission
 *
 * Level 1 (Direct Referrer): 2% of the amount credited to wallet
 * Level 2 (Indirect Referrer): 1% of the amount credited to wallet
 *
 * Can be called with positional arguments:
 *   distributeReferralCommission(buyerId, amount, referenceId, transactionRef)
 * or with an options object:
 *   distributeReferralCommission({ buyerId, amount, referenceId, transactionRef })
 */
const distributeReferralCommission = async (
  buyerIdOrOptions,
  amountParam,
  referenceIdParam,
  transactionRefParam
) => {
  try {
    let buyerId, amount, referenceId, transactionRef;

    if (
      typeof buyerIdOrOptions === 'object' &&
      buyerIdOrOptions !== null &&
      !buyerIdOrOptions._bsontype &&
      !buyerIdOrOptions.constructor?.name?.includes('ObjectId')
    ) {
      buyerId = buyerIdOrOptions.buyerId;
      amount = buyerIdOrOptions.amount;
      referenceId = buyerIdOrOptions.referenceId;
      transactionRef = buyerIdOrOptions.transactionRef;
    } else {
      buyerId = buyerIdOrOptions;
      amount = amountParam;
      referenceId = referenceIdParam;
      transactionRef = transactionRefParam;
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return {
        success: false,
        message: 'Invalid amount for referral commission',
      };
    }

    const buyer = await User.findById(buyerId);
    if (!buyer) {
      return {
        success: false,
        message: 'Buyer user not found',
      };
    }

    const distributionResult = {
      level1: null,
      level2: null,
    };

    const buyerDisplayName = buyer.fullName || buyer.email || 'Team Member';
    const depositRefLabel = transactionRef || (referenceId ? referenceId.toString().slice(-6) : '');

    // Level 1: Direct Referrer (2%)
    if (buyer.referredBy) {
      const l1Referrer = await User.findById(buyer.referredBy);
      if (l1Referrer) {
        const l1Commission = Number((numericAmount * 0.02).toFixed(2));
        if (l1Commission > 0) {
          const l1Description = `Level 1 referral bonus (2%) from ${buyerDisplayName}${
            depositRefLabel ? ` (Ref: ${depositRefLabel})` : ''
          }`;

          await adjustWalletBalance({
            userId: l1Referrer._id,
            amount: l1Commission,
            type: 'credit',
            category: 'referral_bonus',
            description: l1Description,
            referenceId: referenceId || null,
          });

          await pushNotification({
            userId: l1Referrer._id,
            title: 'Level 1 Referral Bonus Received 🎉',
            message: `You earned ₹${l1Commission} (2% Level 1 commission) from ${buyerDisplayName}'s approved deposit.`,
            type: 'referral',
          });

          distributionResult.level1 = {
            referrerId: l1Referrer._id,
            name: l1Referrer.fullName,
            amount: l1Commission,
            rate: '2%',
          };
        }
      }
    }

    // Level 2: Indirect Grandparent Referrer (1%)
    if (buyer.referredByL2) {
      const l2Referrer = await User.findById(buyer.referredByL2);
      if (l2Referrer) {
        const l2Commission = Number((numericAmount * 0.01).toFixed(2));
        if (l2Commission > 0) {
          const l2Description = `Level 2 referral bonus (1%) from ${buyerDisplayName}${
            depositRefLabel ? ` (Ref: ${depositRefLabel})` : ''
          }`;

          await adjustWalletBalance({
            userId: l2Referrer._id,
            amount: l2Commission,
            type: 'credit',
            category: 'referral_bonus',
            description: l2Description,
            referenceId: referenceId || null,
          });

          await pushNotification({
            userId: l2Referrer._id,
            title: 'Level 2 Referral Bonus Received 🎉',
            message: `You earned ₹${l2Commission} (1% Level 2 commission) from ${buyerDisplayName}'s approved deposit.`,
            type: 'referral',
          });

          distributionResult.level2 = {
            referrerId: l2Referrer._id,
            name: l2Referrer.fullName,
            amount: l2Commission,
            rate: '1%',
          };
        }
      }
    }

    return {
      success: true,
      message: 'Referral commission distributed successfully',
      data: distributionResult,
    };
  } catch (error) {
    console.error('[Referral Commission Distribution Error]:', error);
    return {
      success: false,
      message: error.message,
    };
  }
};

module.exports = {
  generateUniqueReferralCode,
  distributeReferralCommission,
};
