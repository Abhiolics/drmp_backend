const express = require('express');
const router = express.Router();
const {
  createWithdrawal,
  getUserWithdrawals,
  getAllWithdrawalsAdmin,
  approveWithdrawal,
  rejectWithdrawal,
} = require('../controllers/withdrawalController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

// User routes
router.post('/', protect, createWithdrawal);
router.get('/', protect, getUserWithdrawals);

// Admin routes
router.get('/admin', protect, isAdmin, getAllWithdrawalsAdmin);
router.put('/admin/:id/approve', protect, isAdmin, approveWithdrawal);
router.put('/admin/:id/reject', protect, isAdmin, rejectWithdrawal);

module.exports = router;
