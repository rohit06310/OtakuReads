import React, { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { addToCart } from '../store/cartSlice'
import { fetchBookReviewsThunk, addReviewThunk, deleteReviewThunk } from '../store/reviewSlice'
import { Star, ShoppingCart, BookOpen, User, Calendar, MessageSquare, Plus, Trash2, CheckCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'

const BookDetails = () => {
  const { id } = useParams()
  const dispatch = useDispatch()
  
  const { books } = useSelector((state) => state.books)
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const { items } = useSelector((state) => state.cart)
  const { reviews } = useSelector((state) => state.reviews)
  
  const [reviewText, setReviewText] = useState('')
  const [rating, setRating] = useState(5)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const book = books.find((b) => b._id === id || b.id === id)
  
  useEffect(() => {
    if (book) {
      dispatch(fetchBookReviewsThunk(book._id || book.id))
    }
  }, [book, dispatch])

  if (!book) return <Navigate to="/books" replace />
  
  const isInCart = items.some(item => (item._id || item.id) === (book._id || book.id))

  const handleAddToCart = () => {
    if (!isAuthenticated) return toast.error('Please login to add books to cart')
    if (isInCart) return toast.error('Book already in cart')
    dispatch(addToCart(book))
    toast.success('Book added to cart')
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) return toast.error('Please login to review')
    if (!reviewText.trim()) return toast.error('Please write a review')

    const res = await dispatch(addReviewThunk({ bookId: book._id || book.id, rating, comment: reviewText }))
    if (addReviewThunk.fulfilled.match(res)) {
      setReviewText('')
      setRating(5)
      toast.success('Review added!')
    }
  }
  
  const handleDeleteReview = async (reviewId) => {
    if (confirm('Are you sure you want to delete this review?')) {
      const res = await dispatch(deleteReviewThunk(reviewId))
      if (deleteReviewThunk.fulfilled.match(res)) {
        toast.success('Review deleted successfully')
      } else {
        toast.error('Failed to delete review')
      }
    }
  }

  const renderStars = (rating) => (
    [...Array(5)].map((_, index) => (
      <Star key={index} className={`w-5 h-5 ${index < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
    ))
  )

  const averageRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : book.rating || 5

  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Book Header Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 lg:p-12 shadow-2xl mb-8 relative overflow-hidden">
          {/* Background glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
            {/* Book Cover */}
            <div className="lg:col-span-4 flex justify-center lg:justify-start">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                <img src={book.coverImage} alt={book.title} className="relative w-full max-w-sm rounded-xl shadow-2xl border border-gray-700" />
              </div>
            </div>

            {/* Book Info */}
            <div className="lg:col-span-8 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider mb-6 w-fit">
                <BookOpen size={14} /> {book.category}
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-black text-white mb-4 leading-tight">{book.title}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-gray-400 mb-8">
                <div className="flex items-center gap-2"><User size={18} /> <span className="font-medium text-white">{book.author}</span></div>
                <div className="flex items-center gap-1">
                  <div className="flex">{renderStars(averageRating)}</div>
                  <span className="font-bold text-white ml-2">{averageRating}</span>
                  <span className="text-sm">({reviews.length} reviews)</span>
                </div>
                <div className="flex items-center gap-2"><BookOpen size={18} /> <span>{book.pages} pages</span></div>
              </div>
              
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-8">
                ₹{book.price}
              </div>

              <div className="prose prose-invert max-w-none mb-10">
                <p className="text-gray-300 text-lg leading-relaxed">{book.description}</p>
              </div>

              <button onClick={handleAddToCart} disabled={isInCart}
                className={`w-full md:w-auto py-4 px-10 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                  isInCart ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 shadow-lg shadow-purple-500/25'
                }`}>
                <ShoppingCart size={24} /> {isInCart ? 'Already in Cart' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Book Preview */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3"><BookOpen className="text-purple-500" /> Book Preview</h2>
                <button onClick={() => setShowPreviewModal(true)} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-opacity">
                  <BookOpen size={14} /> Open Reader Mode
                </button>
              </div>
              <div className="bg-gray-950 border border-gray-800 p-8 rounded-2xl relative">
                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500 to-pink-500 rounded-l-2xl" />
                <p className="text-gray-300 leading-loose italic text-lg whitespace-pre-wrap">"{book.preview}"</p>
                <div className="mt-8 pt-6 border-t border-gray-800 text-sm text-gray-500 font-medium">
                  This is a sample preview. Purchase the book to read the full content.
                </div>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><MessageSquare className="text-pink-500" /> Reviews</h2>
              
              {/* Add Review Form */}
              {isAuthenticated ? (
                <form onSubmit={handleReviewSubmit} className="mb-8 bg-gray-800 border border-gray-700 rounded-2xl p-5">
                  <h3 className="font-bold text-white mb-3 text-sm">Write a Review</h3>
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                        <Star className={`w-6 h-6 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="What did you think of the book?" rows={3}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-purple-500 outline-none mb-3 resize-none" />
                  <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
                    <Plus size={16} /> Submit Review
                  </button>
                </form>
              ) : (
                <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-5 mb-8 text-center">
                  <p className="text-sm text-gray-400 mb-3">Login to leave a review</p>
                </div>
              )}

              {/* Review List */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                {reviews.length > 0 ? reviews.map(review => (
                  <div key={review._id} className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                          {review.user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            {review.user?.name || 'User'}
                            {review.isVerifiedPurchase && (
                              <span className="inline-flex items-center gap-0.5 bg-green-500/10 text-green-400 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border border-green-500/20" title="Verified Purchase">
                                <CheckCircle size={10} className="fill-current" /> Verified
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => <Star key={i} size={12} className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'} />)}
                        </div>
                        {user && (user.role === 'admin' || user._id === (review.user?._id || review.user)) && (
                          <button onClick={() => handleDeleteReview(review._id)} className="text-red-500 hover:text-red-400 p-1 transition-colors" title="Delete Review">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{review.comment}</p>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <MessageSquare size={32} className="text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No reviews yet. Be the first!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Fullscreen Preview Reader Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4 md:p-8">
          <div className="max-w-3xl mx-auto w-full flex flex-col h-full bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Preview: {book.title}
                  <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">Sample Preview</span>
                </h2>
                <p className="text-xs text-gray-400">by {book.author}</p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-850 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-gray-950 text-gray-200 select-none">
              <div className="max-w-2xl mx-auto font-serif text-lg leading-loose space-y-6">
                <p className="whitespace-pre-wrap italic">"{book.preview}"</p>
              </div>
            </div>
            
            <div className="bg-gray-950 border-t border-gray-800 px-6 py-4 text-center text-xs text-gray-500 font-medium">
              You are reading a sample of {book.title}. Purchase this e-book to unlock the full high-quality PDF.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookDetails