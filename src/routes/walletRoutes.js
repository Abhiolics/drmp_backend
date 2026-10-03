const express = require('express');
const router = express.Router();
const {
  getWallet,
  getTransactions,
  adminAdjustWallet,
} = require('../controllers/walletController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

// User routes
router.get('/', protect, getWallet);
router.get('/transactions', protect, getTransactions);

// Admin routes
router.post('/admin/adjust', protect, isAdmin, adminAdjustWallet);

module.exports = router;
