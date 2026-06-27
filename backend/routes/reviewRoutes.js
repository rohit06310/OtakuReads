const express = require('express');
const router = express.Router();
const {
  addReview,
  getBookReviews,
  deleteReview,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.post('/', protect, addReview);
router.get('/book/:id', getBookReviews);
router.delete('/:id', protect, deleteReview);

module.exports = router;
