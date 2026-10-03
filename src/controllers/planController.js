const Plan = require('../models/Plan');

// @desc    Get all plans (Admin)
// @route   GET /api/plans/admin or /plans/admin
// @access  Private/Admin
exports.getAllPlansAdmin = async (req, res, next) => {
  try {
    const plans = await Plan.find().sort({ amount: 1 });
    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active plans (Public/User)
// @route   GET /api/plans or /plans
// @access  Public
exports.getActivePlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ amount: 1 });
    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create plan
// @route   POST /api/plans/admin or /plans/admin
// @access  Private/Admin
exports.createPlan = async (req, res, next) => {
  try {
    const { name, amount, description } = req.body;

    if (!name || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name and amount for the plan',
      });
    }

    const plan = await Plan.create({
      name,
      amount,
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update plan
// @route   PUT /api/plans/admin/:id or /plans/admin/:id
// @access  Private/Admin
exports.updatePlan = async (req, res, next) => {
  try {
    let plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Plan updated successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete plan
// @route   DELETE /api/plans/admin/:id or /plans/admin/:id
// @access  Private/Admin
exports.deletePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    await plan.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Plan deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle plan active status
// @route   PATCH /api/plans/admin/:id/toggle or /plans/admin/:id/toggle
// @access  Private/Admin
exports.togglePlan = async (req, res, next) => {
  try {
    const plan = await Plan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    plan.isActive = !plan.isActive;
    await plan.save();

    res.status(200).json({
      success: true,
      message: `Plan ${plan.isActive ? 'activated' : 'deactivated'} successfully`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};
