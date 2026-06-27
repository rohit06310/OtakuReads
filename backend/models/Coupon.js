const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Please add a coupon code'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: [true, 'Please add a discount value'],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
    },
    maxUses: {
      type: Number,
      default: null, // null means unlimited
    },
    currentUses: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Please set an expiration date'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to check if coupon is valid
couponSchema.methods.isValid = function (orderAmount = 0) {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  if (this.maxUses !== null && this.currentUses >= this.maxUses) return false;
  if (orderAmount < this.minOrderAmount) return false;
  return true;
};

module.exports = mongoose.model('Coupon', couponSchema);
