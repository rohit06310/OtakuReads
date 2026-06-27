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
  
  const bookId = book._id || book.id
  const isInCart = cartItems.some(item => (item._id || item.id) === bookId)
  const isInWishlist = wishlistItems?.some(item => (item._id || item.id) === bookId) || false

  const handleAddToCart = (e) => {
    e.preventDefault()
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

  const handleWishlistToggle = (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Please login to add books to wishlist')
      return
    }

    if (isInWishlist) {
      dispatch(removeFromWishlist(bookId))
      toast.success('Removed from wishlist')
    } else {
      dispatch(addToWishlist(book))
      toast.success('Added to wishlist')
    }
  }

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`w-3 h-3 ${
          index < Math.floor(rating || 5)
            ? 'text-yellow-400 fill-current'
            : 'text-gray-600'
        }`}
      />
    ))
  }

  return (
    <Link to={`/books/${bookId}`} className="group block">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 relative flex flex-col h-full">
        
        {/* Wishlist Button (Absolute) */}
        <button
          onClick={handleWishlistToggle}
          className={`absolute top-4 right-4 z-10 p-2 rounded-full backdrop-blur-md transition-all ${
            isInWishlist
              ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
              : 'bg-black/40 text-white/70 hover:bg-black/60 hover:text-white'
          }`}
          title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Bookmark className={`w-4 h-4 ${isInWishlist ? 'fill-current' : ''}`} />
        </button>

        {/* Cover Image Container */}
        <div className="relative overflow-hidden aspect-[3/4]">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-0 opacity-80" />
          <img
            src={book.coverImage}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {/* Category Badge */}
          <div className="absolute bottom-4 left-4 z-10">
            <span className="px-2 py-1 bg-purple-600/80 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded">
              {book.category}
            </span>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="mb-auto">
            <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 group-hover:text-purple-400 transition-colors">
              {book.title}
            </h3>
            <p className="text-gray-400 text-xs mb-3 font-medium">by {book.author}</p>
            
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center bg-gray-800 px-2 py-1 rounded-lg">
                {renderStars(book.rating || 5)}
                <span className="text-xs text-gray-300 ml-1 font-bold">{book.rating || 5.0}</span>
              </div>
              <span className="text-xs text-gray-500">{book.pages}p</span>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-800">
            <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              ₹{book.price}
            </span>
            
            <button
              onClick={handleAddToCart}
              disabled={isInCart}
              className={`p-2.5 rounded-xl transition-all ${
                isInCart
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-500/25'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default BookCard
