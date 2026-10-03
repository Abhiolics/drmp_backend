const express = require('express');
const router = express.Router();
const {
  getAllGiftCodesAdmin,
  createGiftCode,
  updateGiftCode,
  deleteGiftCode,
  toggleGiftCode,
  redeemGiftCode,
} = require('../controllers/giftCodeController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

// User redemption
router.post('/redeem', protect, redeemGiftCode);

// Admin routes
router.get('/admin', protect, isAdmin, getAllGiftCodesAdmin);
router.post('/admin', protect, isAdmin, createGiftCode);
router.put('/admin/:id', protect, isAdmin, updateGiftCode);
router.delete('/admin/:id', protect, isAdmin, deleteGiftCode);
router.patch('/admin/:id/toggle', protect, isAdmin, toggleGiftCode);

module.exports = router;
