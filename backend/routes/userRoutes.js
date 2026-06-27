const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUserRole,
  banUnbanUser,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.get('/', protect, authorize('admin'), getAllUsers);
router.put('/:id/role', protect, authorize('admin'), updateUserRole);
router.put('/:id/ban', protect, authorize('admin'), banUnbanUser);

module.exports = router;
