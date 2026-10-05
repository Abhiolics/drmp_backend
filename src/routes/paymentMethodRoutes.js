const express = require('express');
const router = express.Router();
const {
  getPaymentMethodsPublic,
  getPaymentMethodsAdmin,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  enablePaymentMethod,
} = require('../controllers/paymentMethodController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

// Public route for active payment methods
router.get(['/', '/payment-methods'], getPaymentMethodsPublic);

// Admin endpoints (supports both /admin and /admin/payment-methods paths)
router.get(['/admin', '/admin/payment-methods'], protect, isAdmin, getPaymentMethodsAdmin);
router.post(['/admin', '/admin/payment-methods'], protect, isAdmin, addPaymentMethod);
router.put(['/admin/enable', '/admin/payment-methods/enable'], protect, isAdmin, enablePaymentMethod);
router.put(['/admin/:id', '/admin/payment-methods/:id'], protect, isAdmin, updatePaymentMethod);
router.delete(['/admin/:id', '/admin/payment-methods/:id'], protect, isAdmin, deletePaymentMethod);

module.exports = router;
