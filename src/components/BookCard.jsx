

import React from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { addToCart } from '../store/cartSlice'
import { Star, ShoppingCart, Bookmark } from 'lucide-react'
import toast from 'react-hot-toast'
import { addToWishlist, removeFromWishlist } from '../store/wishlistSlice'

const BookCard = ({ book }) => {
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector((state) => state.auth)
  const { items: cartItems } = useSelector((state) => state.cart)
  const { items: wishlistItems } = useSelector((state) => state.wishlist)
  
  const isInCart = cartItems.some(item => item.id === book.id)
  const isInWishlist = wishlistItems.some(item => item.id === book.id)

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

  const handleWishlistToggle = () => {
    if (!isAuthenticated) {
      toast.error('Please login to add books to wishlist')
      return
    }

    if (isInWishlist) {
      dispatch(removeFromWishlist(book.id))
    } else {
      dispatch(addToWishlist(book))
    }
  }

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
      <div className="relative overflow-hidden">
        <img
          src={book.coverImage}
          alt={book.title}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
      </div>
      
      <div className="p-6">
        <div className="mb-2">
          <h3 className="text-xl font-semibold text-gray-900 mb-1 line-clamp-2">
            {book.title}
          </h3>
          <p className="text-gray-600 text-sm">by {book.author}</p>
        </div>
        
        <div className="flex items-center mb-3">
          <div className="flex items-center mr-2">
            {renderStars(book.rating)}
          </div>
          <span className="text-sm text-gray-600">({book.rating})</span>
        </div>
        
        <p className="text-gray-700 text-sm mb-4 line-clamp-3">
          {book.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-blue-600">
            ₹{book.price}
          </span>
          <span className="text-sm text-gray-500">
            {book.pages} pages
          </span>
        </div>
        
        <div className="mt-4 flex gap-2">
          <Link
            to={`/books/${book.id}`}
            className="flex-1 bg-gray-100 text-gray-700 text-center py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            View Details
          </Link>
          <button
            onClick={handleAddToCart}
            disabled={isInCart}
            className={`flex-1 py-2 px-4 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 ${
              isInCart
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {isInCart ? 'In Cart' : 'Add to Cart'}
          </button>
          <button
            onClick={handleWishlistToggle}
            className={`p-2 rounded-lg transition-colors ${
              isInWishlist
                ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
            title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Bookmark className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default BookCard
