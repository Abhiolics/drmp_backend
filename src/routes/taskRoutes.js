const express = require('express');
const router = express.Router();
const {
  getUserTasks,
  submitTaskProof,
  getUserSubmissions,
  adminGetAllTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
  adminGetAllSubmissions,
  approveSubmission,
  rejectSubmission,
} = require('../controllers/taskController');
const { protect, isAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// User routes
router.get('/', protect, getUserTasks);
router.post('/:id/submit', protect, upload.single('proof'), submitTaskProof);
router.get('/submissions', protect, getUserSubmissions);

// Admin routes - Tasks CRUD & Toggle
router.get('/admin', protect, isAdmin, adminGetAllTasks);
router.post('/admin', protect, isAdmin, createTask);
router.put('/admin/:id', protect, isAdmin, updateTask);
router.delete('/admin/:id', protect, isAdmin, deleteTask);
router.patch('/admin/:id/toggle', protect, isAdmin, toggleTask);

// Admin routes - Submissions review
router.get('/admin/submissions', protect, isAdmin, adminGetAllSubmissions);
router.put('/admin/submissions/:id/approve', protect, isAdmin, approveSubmission);
router.put('/admin/submissions/:id/reject', protect, isAdmin, rejectSubmission);

module.exports = router;
