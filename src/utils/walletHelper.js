const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

/**
 * Adjust wallet balance and log an immutable transaction ledger
 */
const adjustWalletBalance = async ({
  userId,
  amount,
  type, // 'credit' or 'debit'
  category = 'other',
  description = '',
  referenceId = null,
}) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId, balance: 0 });
  }

  const numericAmount = Number(amount);

  if (type === 'credit') {
    wallet.balance += numericAmount;
  } else if (type === 'debit') {
    if (wallet.balance < numericAmount) {
      throw new Error(`Insufficient wallet balance. Current balance: ${wallet.balance}`);
    }
    wallet.balance -= numericAmount;
  } else {
    throw new Error('Invalid adjustment type. Must be credit or debit');
  }

  await wallet.save();

  // Create immutable transaction
  const transaction = await Transaction.create({
    user: userId,
    wallet: wallet._id,
    amount: numericAmount,
    type,
    category,
    description,
    referenceId,
    status: 'completed',
  });

  return { wallet, transaction };
};

/**
 * Push an in-app notification to a user
 */
const pushNotification = async ({ userId, title, message, type = 'info' }) => {
  try {
    return await Notification.create({
      user: userId,
      title,
      message,
      type,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
};

module.exports = {
  adjustWalletBalance,
  pushNotification,
};
