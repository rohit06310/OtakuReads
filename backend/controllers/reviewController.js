const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Book = require('../models/Book');
const Order = require('../models/Order');

// @desc    Add a review
// @route   POST /api/reviews
// @access  Private
const addReview = asyncHandler(async (req, res) => {
  const { bookId, rating, title, comment } = req.body;

  if (!bookId || !rating || !comment) {
    res.status(400);
    throw new Error('Please fill in all review details (bookId, rating, comment)');
  }

  const book = await Book.findById(bookId);
  if (!book) {
    res.status(404);
    throw new Error('Book not found');
  }

  // Check if user has already reviewed this book
  const alreadyReviewed = await Review.findOne({
    book: bookId,
    user: req.user._id,
  });

  if (alreadyReviewed) {
    res.status(400);
    throw new Error('You have already reviewed this book');
  }

  // Check if they purchased the book (verified purchase check)
  const orders = await Order.find({
    user: req.user._id,
    'items.book': bookId,
  });
  const isVerifiedPurchase = orders.length > 0;

  const review = new Review({
    user: req.user._id,
    book: bookId,
    rating: Number(rating),
    title: title || '',
    comment,
    isVerifiedPurchase,
  });

  await review.save();

  await review.populate('user', 'name avatar');

  res.status(201).json({
    success: true,
    review,
    isVerifiedPurchase,
  });
});

// @desc    Get book reviews
// @route   GET /api/reviews/book/:id
// @access  Public
const getBookReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ book: req.params.id })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    reviews,
  });
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    res.status(404);
    throw new Error('Review not found');
  }

  // Check if own review or is admin
  if (
    review.user.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    res.status(403);
    throw new Error('Not authorized to delete this review');
  }

  await Review.findOneAndDelete({ _id: req.params.id });

  res.json({
    success: true,
    message: 'Review deleted successfully',
  });
});

module.exports = {
  addReview,
  getBookReviews,
  deleteReview,
};
