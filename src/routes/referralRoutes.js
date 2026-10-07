const express = require('express');
const router = express.Router();
const {
  getReferralStats,
  getReferralLandingPage,
} = require('../controllers/referralController');
const { protect } = require('../middlewares/authMiddleware');

// Protected referral statistics & team dashboard endpoint
router.get('/stats', protect, getReferralStats);

// Public referral landing page & lookup
router.get('/:code', getReferralLandingPage);

module.exports = router;
