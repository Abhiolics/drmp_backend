const express = require('express');
const router = express.Router();
const {
  createDeposit,
  getUserDeposits,
  getAllDepositsAdmin,
  approveDeposit,
  rejectDeposit,
} = require('../controllers/depositController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// User routes
router.post('/', protect, upload.single('paymentProof'), createDeposit);
router.get('/', protect, getUserDeposits);

// Admin routes
router.get('/admin', protect, isAdmin, getAllDepositsAdmin);
router.put('/admin/:id/approve', protect, isAdmin, approveDeposit);
router.put('/admin/:id/reject', protect, isAdmin, rejectDeposit);

module.exports = router;
