import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setSearchQuery, setSelectedCategory, fetchBooksThunk } from '../store/bookSlice'
import BookCard from '../components/BookCard'
import { Search, Filter, Loader } from 'lucide-react'

const Books = () => {
  const dispatch = useDispatch()
  const { filteredBooks, searchQuery, selectedCategory, categories, loading } = useSelector(
    (state) => state.books
  )

  useEffect(() => {
    dispatch(fetchBooksThunk())
  }, [dispatch])

  const handleSearchChange = (e) => {
    dispatch(setSearchQuery(e.target.value))
  }

  const handleCategoryChange = (category) => {
    dispatch(setSelectedCategory(category))
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Browse Books
          </h1>
          <p className="text-lg text-gray-400">
            Discover your next favorite manga or light novel from our extensive collection
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-10 flex flex-col md:flex-row gap-4 bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search books by title or author..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-12 pr-4 py-4 bg-gray-950 border border-gray-800 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative w-full md:w-auto">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5 z-10" />
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full md:w-48 pl-12 pr-10 py-4 bg-gray-950 border border-gray-800 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none cursor-pointer"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-8 flex items-center justify-between">
          <p className="text-gray-400 font-medium">
            Showing <span className="text-white font-bold">{filteredBooks.length}</span> book{filteredBooks.length !== 1 ? 's' : ''}
            {searchQuery && <span> for "<span className="text-white">{searchQuery}</span>"</span>}
            {selectedCategory !== 'All' && <span> in <span className="text-purple-400">{selectedCategory}</span></span>}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader className="w-10 h-10 text-purple-500 animate-spin" />
          </div>
        ) : filteredBooks.length > 0 ? (
          /* Books Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredBooks.map((book) => (
              <BookCard key={book._id || book.id} book={book} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-24 bg-gray-900 border border-gray-800 rounded-3xl">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">
              No books found
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              We couldn't find any books matching your search. Try adjusting your terms or browse a different category.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Books