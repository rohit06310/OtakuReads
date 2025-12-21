import React from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { addToCart } from '../store/cartSlice'
import { Star, ShoppingCart, BookOpen, User, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const BookDetails = () => {
  const { id } = useParams()
  const dispatch = useDispatch()
  const { books } = useSelector((state) => state.books)
  const { isAuthenticated } = useSelector((state) => state.auth)
  const { items } = useSelector((state) => state.cart)
  
  const book = books.find((b) => b.id === id)
  
  if (!book) {
    return <Navigate to="/books" replace />
  }
  
  const isInCart = items.some(item => item.id === book.id)

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      toast.error('Please login to add books to cart')
      return
    }
    
    if (isInCart) {
      toast.error('Book already in cart')
      return
    }

    dispatch(addToCart(book))
    toast.success('Book added to cart')
  }

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`w-5 h-5 ${
          index < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
            {/* Book Cover */}
            <div className="flex justify-center">
              <img
                src={book.coverImage}
                alt={book.title}
                className="w-full max-w-md h-96 object-cover rounded-lg shadow-md"
              />
            </div>

            {/* Book Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {book.title}
                </h1>
                <div className="flex items-center gap-2 text-lg text-gray-600 mb-4">
                  <User className="w-5 h-5" />
                  <span>by {book.author}</span>
                </div>
                
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1">
                    {renderStars(book.rating)}
                    <span className="ml-2 text-gray-600">({book.rating})</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <BookOpen className="w-4 h-4" />
                    <span>{book.pages} pages</span>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <span className="text-3xl font-bold text-blue-600">₹{book.price}</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">{book.description}</p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Category</h3>
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {book.category}
                </span>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={isInCart}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-lg flex items-center justify-center gap-3 transition-colors ${
                  isInCart
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <ShoppingCart className="w-6 h-6" />
                {isInCart ? 'Already in Cart' : 'Add to Cart'}
              </button>
            </div>
          </div>

          {/* Book Preview */}
          <div className="border-t border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Book Preview</h2>
            <div className="bg-gray-50 p-6 rounded-lg">
              <p className="text-gray-700 leading-relaxed italic">
                "{book.preview}"
              </p>
              <p className="text-sm text-gray-500 mt-4">
                This is just a preview. Purchase the book to read the full content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookDetails