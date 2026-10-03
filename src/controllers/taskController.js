const Task = require('../models/Task');
const TaskSubmission = require('../models/TaskSubmission');
const { adjustWalletBalance, pushNotification } = require('../utils/walletHelper');

// @desc    Get all active tasks for user
// @route   GET /api/tasks or /tasks
// @access  Private
exports.getUserTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ isActive: true }).sort({ createdAt: -1 });

    // Also get submission status for the current user for each task
    const userSubmissions = await TaskSubmission.find({ user: req.user.id });
    const submissionMap = {};
    userSubmissions.forEach((sub) => {
      submissionMap[sub.task.toString()] = sub;
    });

    const tasksWithStatus = tasks.map((task) => {
      const submission = submissionMap[task._id.toString()];
      return {
        ...task.toObject(),
        mySubmission: submission
          ? {
              status: submission.status,
              submittedAt: submission.createdAt,
            }
          : null,
      };
    });

    res.status(200).json({
      success: true,
      count: tasksWithStatus.length,
      data: tasksWithStatus,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit task proof
// @route   POST /api/tasks/:id/submit or /tasks/:id/submit
// @access  Private
exports.submitTaskProof = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (!task.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This task is no longer active',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload task proof',
      });
    }

    // Check if user already submitted and is pending/approved
    const existingSubmission = await TaskSubmission.findOne({
      task: taskId,
      user: req.user.id,
      status: { $in: ['pending', 'approved'] },
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existingSubmission.status} submission for this task`,
      });
    }

    const proofUrl = `/uploads/${req.file.filename}`;

    const submission = await TaskSubmission.create({
      task: taskId,
      user: req.user.id,
      proof: proofUrl,
      rewardAmount: task.rewardAmount,
      status: 'pending',
    });

    await pushNotification({
      userId: req.user.id,
      title: 'Task Submitted',
      message: `Your proof for task "${task.title}" has been submitted for review.`,
      type: 'task',
    });

    res.status(201).json({
      success: true,
      message: 'Task proof submitted successfully',
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user submissions
// @route   GET /api/tasks/submissions or /tasks/submissions
// @access  Private
exports.getUserSubmissions = async (req, res, next) => {
  try {
    const submissions = await TaskSubmission.find({ user: req.user.id })
      .populate('task', 'title description rewardAmount')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin get all tasks
// @route   GET /api/tasks/admin or /tasks/admin
// @access  Private/Admin
exports.adminGetAllTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin create task
// @route   POST /api/tasks/admin or /tasks/admin
// @access  Private/Admin
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, rewardAmount } = req.body;

    if (!title || !description || rewardAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, and rewardAmount',
      });
    }

    const task = await Task.create({
      title,
      description,
      rewardAmount: Number(rewardAmount),
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin update task
// @route   PUT /api/tasks/admin/:id or /tasks/admin/:id
// @access  Private/Admin
exports.updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin delete task
// @route   DELETE /api/tasks/admin/:id or /tasks/admin/:id
// @access  Private/Admin
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin toggle task active status
// @route   PATCH /api/tasks/admin/:id/toggle or /tasks/admin/:id/toggle
// @access  Private/Admin
exports.toggleTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.isActive = !task.isActive;
    await task.save();

    res.status(200).json({
      success: true,
      message: `Task ${task.isActive ? 'activated' : 'deactivated'} successfully`,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin get all task submissions
// @route   GET /api/tasks/admin/submissions or /tasks/admin/submissions
// @access  Private/Admin
exports.adminGetAllSubmissions = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const total = await TaskSubmission.countDocuments(query);
    const submissions = await TaskSubmission.find(query)
      .populate('user', 'fullName email phoneNumber')
      .populate('task', 'title description rewardAmount')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: submissions.length,
      total,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin approve task submission
// @route   PUT /api/tasks/admin/submissions/:id/approve or /tasks/admin/submissions/:id/approve
// @access  Private/Admin
exports.approveSubmission = async (req, res, next) => {
  try {
    const submission = await TaskSubmission.findById(req.params.id).populate('task');

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (submission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Submission is already ${submission.status}`,
      });
    }

    submission.status = 'approved';
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = new Date();
    await submission.save();

    // Reward user wallet
    await adjustWalletBalance({
      userId: submission.user,
      amount: submission.rewardAmount,
      type: 'credit',
      category: 'task_reward',
      description: `Task reward: ${submission.task ? submission.task.title : 'Task Completion'}`,
      referenceId: submission._id,
    });

    await pushNotification({
      userId: submission.user,
      title: 'Task Approved',
      message: `Your submission was approved! ₹${submission.rewardAmount} has been credited to your wallet.`,
      type: 'success',
    });

    res.status(200).json({
      success: true,
      message: 'Task submission approved and reward credited to wallet',
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin reject task submission
// @route   PUT /api/tasks/admin/submissions/:id/reject or /tasks/admin/submissions/:id/reject
// @access  Private/Admin
exports.rejectSubmission = async (req, res, next) => {
  try {
    const submission = await TaskSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (submission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Submission is already ${submission.status}`,
      });
    }

    submission.status = 'rejected';
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = new Date();
    submission.rejectionReason = req.body.reason || 'Proof does not meet task requirements';
    await submission.save();

    await pushNotification({
      userId: submission.user,
      title: 'Task Rejected',
      message: `Your task submission was rejected. Reason: ${submission.rejectionReason}`,
      type: 'warning',
    });

    res.status(200).json({
      success: true,
      message: 'Task submission rejected',
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};
