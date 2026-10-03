const express = require('express');
const router = express.Router();
const {
  getAllPlansAdmin,
  getActivePlans,
  createPlan,
  updatePlan,
  deletePlan,
  togglePlan,
} = require('../controllers/planController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

// Public routes
router.get('/', getActivePlans);

// Admin routes (supports both /plans/admin and direct /plans/:id for flexibility)
router.get('/admin', protect, isAdmin, getAllPlansAdmin);
router.post('/admin', protect, isAdmin, createPlan);
router.put('/admin/:id', protect, isAdmin, updatePlan);
router.delete('/admin/:id', protect, isAdmin, deletePlan);
router.patch('/admin/:id/toggle', protect, isAdmin, togglePlan);

// Also support toggle without 'admin' prefix: /plans/:id/toggle
router.patch('/:id/toggle', protect, isAdmin, togglePlan);

module.exports = router;
