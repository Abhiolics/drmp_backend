const express = require('express');
const router = express.Router();
const {
  getMyUpi,
  createUpi,
  updateUpi,
  deleteUpi,
  getAllUpisAdmin,
} = require('../controllers/upiController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');

// Admin endpoint: query all registered UPI directories
router.get(['/admin/all', '/admin', '/admin/upis', '/admin/list'], protect, isAdmin, getAllUpisAdmin);

// User endpoints
router.get('/my', protect, getMyUpi);
router.post('/', protect, createUpi);
router.put('/:id', protect, updateUpi);
router.delete('/:id', protect, deleteUpi);

module.exports = router;
