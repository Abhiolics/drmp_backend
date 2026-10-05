const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getUsers,
  getUserDetails,
  blockUser,
  unblockUser,
  activateUser,
  deactivateUser,
} = require('../controllers/adminController');
const {
  getAdminSettings,
  updateMaintenance,
  updateControl,
  updatePaymentMethods,
} = require('../controllers/settingController');
const {
  getAllContactsAdmin,
  addContact,
  updateContact,
  deleteContact,
} = require('../controllers/contactController');
const {
  getPaymentMethodsAdmin,
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  enablePaymentMethod,
} = require('../controllers/paymentMethodController');
const { getAllUpisAdmin } = require('../controllers/upiController');
const { togglePlan } = require('../controllers/planController');
const { adminSendOtp, adminVerifyOtp } = require('../controllers/authController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

// Public Admin Authentication Routes (OTP based only)
router.post('/send-otp', adminSendOtp);
router.post('/verify-otp', adminVerifyOtp);

// All routes below require Admin authorization
router.use(protect, isAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/block', blockUser);
router.patch('/users/:id/unblock', unblockUser);
router.patch('/users/:id/activate', activateUser);
router.patch('/users/:id/deactivate', deactivateUser);

// App Settings
router.get('/settings', getAdminSettings);
router.put('/settings/maintenance', updateMaintenance);
router.put('/settings/update-control', updateControl);
router.put('/settings/payment', updatePaymentMethods);

// Payment Methods Management (Direct Admin Aliases)
router.get('/payment-methods', getPaymentMethodsAdmin);
router.post('/payment-methods', addPaymentMethod);
router.put('/payment-methods/enable', enablePaymentMethod);
router.put('/payment-methods/:id', updatePaymentMethod);
router.delete('/payment-methods/:id', deletePaymentMethod);

// Global UPI Directory Management
router.get(['/upi/all', '/upis', '/upi-directory'], getAllUpisAdmin);

// Support Contacts
router.get('/contacts', getAllContactsAdmin);
router.post('/contacts', addContact);
router.put('/contacts/:id', updateContact);
router.delete('/contacts/:id', deleteContact);

// Direct plan toggle from collection: /admin/:id/toggle
router.patch('/:id/toggle', togglePlan);

module.exports = router;
