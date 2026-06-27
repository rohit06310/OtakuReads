const asyncHandler = require('express-async-handler');
const Book = require('../models/Book');

// @desc    Get all books
// @route   GET /api/books
// @access  Public
const getBooks = asyncHandler(async (req, res) => {
  const { category, search } = req.query;

  let query = {};

  if (category && category !== 'All') {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { author: { $regex: search, $options: 'i' } },
    ];
  }

  const books = await Book.find(query).sort({ createdAt: -1 });

  res.json({
    success: true,
    count: books.length,
    books,
  });
});

// @desc    Get book by id
// @route   GET /api/books/:id
// @access  Public
const getBookById = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);

  if (book) {
    res.json({
      success: true,
      book,
    });
  } else {
    res.status(404);
    throw new Error('Book not found');
  }
});

// @desc    Create a book
// @route   POST /api/books
// @access  Private/Admin
const createBook = asyncHandler(async (req, res) => {
  const {
    title,
    author,
    price,
    coverImage,
    description,
    preview,
    category,
    pages,
    downloadUrl,
    pdfUrl,
    stock,
    isFeatured,
  } = req.body;

  const book = new Book({
    title,
    author,
    price,
    coverImage,
    description,
    preview,
    category,
    pages,
    downloadUrl: downloadUrl || '#',
    pdfUrl: pdfUrl || null,
    stock: stock || 10,
    isFeatured: isFeatured || false,
    createdBy: req.user._id,
  });

  const createdBook = await book.save();

  res.status(201).json({
    success: true,
    book: createdBook,
  });
});

// @desc    Update a book
// @route   PUT /api/books/:id
// @access  Private/Admin
const updateBook = asyncHandler(async (req, res) => {
  const {
    title,
    author,
    price,
    coverImage,
    description,
    preview,
    category,
    pages,
    downloadUrl,
    pdfUrl,
    stock,
    isFeatured,
  } = req.body;

  const book = await Book.findById(req.params.id);

  if (book) {
    book.title = title || book.title;
    book.author = author || book.author;
    book.price = price !== undefined ? price : book.price;
    book.coverImage = coverImage || book.coverImage;
    book.description = description || book.description;
    book.preview = preview !== undefined ? preview : book.preview;
    book.category = category || book.category;
    book.pages = pages !== undefined ? pages : book.pages;
    book.downloadUrl = downloadUrl || book.downloadUrl;
    book.pdfUrl = pdfUrl !== undefined ? pdfUrl : book.pdfUrl;
    book.stock = stock !== undefined ? stock : book.stock;
    book.isFeatured = isFeatured !== undefined ? isFeatured : book.isFeatured;

    const updatedBook = await book.save();

    res.json({
      success: true,
      book: updatedBook,
    });
  } else {
    res.status(404);
    throw new Error('Book not found');
  }
});

// @desc    Delete a book
// @route   DELETE /api/books/:id
// @access  Private/Admin
const deleteBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);

  if (book) {
    await Book.deleteOne({ _id: req.params.id });
    res.json({
      success: true,
      message: 'Book removed successfully',
    });
  } else {
    res.status(404);
    throw new Error('Book not found');
  }
});

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
};
