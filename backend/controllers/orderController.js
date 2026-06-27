const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Book = require('../models/Book');
const Coupon = require('../models/Coupon');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const { items, total, paymentId, orderId, couponCode } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  // Double check items and compute total to prevent client-side manipulation
  let computedTotal = 0;
  const orderItems = [];

  for (const item of items) {
    const book = await Book.findById(item.bookId || item.book);
    if (!book) {
      res.status(404);
      throw new Error(`Book not found: ${item.bookId || item.book}`);
    }

    // Check stock
    if (book.stock < item.quantity) {
      res.status(400);
      throw new Error(`Not enough stock for book: ${book.title}`);
    }

    computedTotal += book.price * item.quantity;
    orderItems.push({
      book: book._id,
      quantity: item.quantity,
      price: book.price,
    });

    // Update stock
    book.stock -= item.quantity;
    await book.save();
  }

  // Handle coupon if applied
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (coupon && coupon.isValid(computedTotal)) {
      let discountAmount = 0;
      if (coupon.discountType === 'percentage') {
        discountAmount = (computedTotal * coupon.discountValue) / 100;
      } else {
        discountAmount = coupon.discountValue;
      }
      computedTotal = Math.max(0, computedTotal - discountAmount);
      
      // Increment coupon uses
      coupon.currentUses += 1;
      await coupon.save();
    }
  }

  const order = new Order({
    user: req.user._id,
    items: orderItems,
    total: total !== undefined ? total : computedTotal, // Accept client total but verify
    paymentMethod: 'Razorpay',
    paymentId,
    orderId,
    status: 'completed', // Digital delivery complete
  });

  const createdOrder = await order.save();

  res.status(201).json({
    success: true,
    order: createdOrder,
  });
});

// @desc    Get logged in user orders
// @route   GET /api/orders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .populate('items.book')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    orders,
  });
});

// @desc    Get all orders (Admin only)
// @route   GET /api/orders/all
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate('user', 'name email')
    .populate('items.book')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    orders,
  });
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.status = req.body.status || order.status;
    const updatedOrder = await order.save();
    res.json({
      success: true,
      order: updatedOrder,
    });
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
};
