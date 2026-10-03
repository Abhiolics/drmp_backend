const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Setting = require('../models/Setting');
const Plan = require('../models/Plan');

const seedInitialData = async () => {
  try {
    // 1. Seed or verify Admin user
    const ADMIN_AUTHORIZED_EMAIL = 'abhisheksingh03674@gmail.com';
    const adminEmail = (
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_EMAIL.trim().toLowerCase() !== 'admin@example.com'
        ? process.env.ADMIN_EMAIL.trim()
        : ADMIN_AUTHORIZED_EMAIL
    ).toLowerCase().trim();
    let admin = await User.findOne({ email: adminEmail }).select('+password');

    if (!admin) {
      admin = await User.create({
        fullName: process.env.ADMIN_NAME || 'Super Admin',
        phoneNumber: process.env.ADMIN_PHONE || '9999999999',
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        role: 'admin',
        isEmailVerified: true,
        isActive: true,
        isBlocked: false,
      });

      await Wallet.create({
        user: admin._id,
        balance: 100000,
      });

      console.log(`[Seed] Admin user created: ${adminEmail}`);
    } else {
      // Ensure admin privileges
      admin.role = 'admin';
      admin.isActive = true;
      admin.isBlocked = false;
      admin.isEmailVerified = true;
      await admin.save();

      // Ensure wallet exists
      const wallet = await Wallet.findOne({ user: admin._id });
      if (!wallet) {
        await Wallet.create({ user: admin._id, balance: 100000 });
      }
    }

    // Demote any other accounts with admin role to 'user' so only the designated admin has access
    await User.updateMany(
      { email: { $ne: adminEmail }, role: 'admin' },
      { role: 'user' }
    );

    // 2. Seed initial Settings singleton
    await Setting.getSettings();

    // 3. Seed sample plans if none exist
    const planCount = await Plan.countDocuments();
    if (planCount === 0) {
      await Plan.create([
        {
          name: 'Silver',
          amount: 499,
          description: 'Basic membership with daily task limits and standard rewards.',
          isActive: true,
        },
        {
          name: 'Gold',
          amount: 1399,
          description: 'Unlimited transactions with cashback Membership benefits.',
          isActive: true,
        },
        {
          name: 'Platinum',
          amount: 2999,
          description: 'VIP privileges with instant withdrawals and highest task multipliers.',
          isActive: true,
        },
      ]);
      console.log('[Seed] Default membership plans created');
    }
  } catch (error) {
    console.error('[Seed] Error seeding data:', error.message);
  }
};

module.exports = seedInitialData;
