const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 });

  res.json({
    success: true,
    users,
  });
});

// @desc    Update user role
// @route   PUT /api/users/:id/role
// @access  Private/Superadmin
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!['reader', 'admin'].includes(role)) {
    res.status(400);
    throw new Error('Invalid role specified');
  }

  const user = await User.findById(req.params.id);

  if (user) {
    // Prevent changing your own role
    if (user._id.toString() === req.user._id.toString()) {
      res.status(403);
      throw new Error('You cannot change your own role');
    }

    user.role = role;
    const updatedUser = await user.save();

    res.json({
      success: true,
      message: `User role updated to ${role} successfully`,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Ban or unban user
// @route   PUT /api/users/:id/ban
// @access  Private/Admin
const banUnbanUser = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'active' or 'banned'

  if (!['active', 'banned'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status specified. Must be active or banned');
  }

  const user = await User.findById(req.params.id);

  if (user) {
    if (user._id.toString() === req.user._id.toString()) {
      res.status(403);
      throw new Error('You cannot ban yourself');
    }

    user.status = status;
    const updatedUser = await user.save();

    res.json({
      success: true,
      message: `User status changed to ${status} successfully`,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
  getAllUsers,
  updateUserRole,
  banUnbanUser,
};
