const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const planRoutes = require('./planRoutes');
const giftCodeRoutes = require('./giftCodeRoutes');
const depositRoutes = require('./depositRoutes');
const withdrawalRoutes = require('./withdrawalRoutes');
const taskRoutes = require('./taskRoutes');
const walletRoutes = require('./walletRoutes');
const notificationRoutes = require('./notificationRoutes');
const { getPublicSettings, getPaymentMethods } = require('../controllers/settingController');
const { getContacts } = require('../controllers/contactController');

// Mount sub-routers
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/plans', planRoutes);
router.use('/gift-codes', giftCodeRoutes);
router.use('/deposits', depositRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/tasks', taskRoutes);
router.use('/wallet', walletRoutes);
router.use('/notifications', notificationRoutes);

// Public app endpoints from settings folder
router.get('/app/settings', getPublicSettings);
router.get('/payment-methods', getPaymentMethods);
router.get('/contacts', getContacts);

module.exports = router;
