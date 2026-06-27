const express = require('express');
const router = express.Router();
const {
  createCoupon,
  getCoupons,
  validateCoupon,
} = require('../controllers/couponController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roleCheck');

router.route('/')
  .get(protect, authorize('admin'), getCoupons)
  .post(protect, authorize('admin'), createCoupon);

router.post('/validate', protect, validateCoupon);

module.exports = router;
