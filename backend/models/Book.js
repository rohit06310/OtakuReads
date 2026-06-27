const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a book title'],
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Please add an author name'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
    },
    coverImage: {
      type: String,
      required: [true, 'Please add a cover image URL'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    preview: {
      type: String,
      default: '',
    },
    downloadUrl: {
      type: String,
      default: '#',
    },
    pdfUrl: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    pages: {
      type: Number,
      required: [true, 'Please add the page count'],
    },
    stock: {
      type: Number,
      default: 10,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Book', bookSchema);
