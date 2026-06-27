const asyncHandler = require('express-async-handler');
const Coupon = require('../models/Coupon');

// @desc    Create a coupon
// @route   POST /api/coupons
// @access  Private/Admin
const createCoupon = asyncHandler(async (req, res) => {
  const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, isActive } = req.body;

  const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
  if (couponExists) {
    res.status(400);
    throw new Error('Coupon code already exists');
  }

  const coupon = new Coupon({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    minOrderAmount: minOrderAmount || 0,
    maxUses: maxUses !== undefined ? maxUses : null,
    expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
    isActive: isActive !== undefined ? isActive : true,
  });

  const createdCoupon = await coupon.save();

  res.status(201).json({
    success: true,
    coupon: createdCoupon,
  });
});

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find({}).sort({ createdAt: -1 });

  res.json({
    success: true,
    coupons,
  });
});

// @desc    Validate a coupon
// @route   POST /api/coupons/validate
// @access  Private
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderAmount } = req.body;

  if (!code) {
    res.status(400);
    throw new Error('Please provide a coupon code');
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  if (!coupon) {
    res.status(404);
    throw new Error('Coupon not found');
  }

  if (!coupon.isValid(orderAmount)) {
    res.status(400);
    throw new Error('Coupon is invalid, expired, or has reached its use limit, or minimum amount is not met');
  }

  res.json({
    success: true,
    message: 'Coupon code applied successfully!',
    coupon: {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount,
    },
  });
});

module.exports = {
  createCoupon,
  getCoupons,
  validateCoupon,
};
