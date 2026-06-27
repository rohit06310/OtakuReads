import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../store/authSlice'
import { ShoppingCart, User, BookOpen, Menu, X, LogOut, Bookmark, Shield, Crown } from 'lucide-react'
import toast from 'react-hot-toast'

const RoleBadge = ({ role }) => {
  if (role === 'admin') return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
      <Shield size={10} /> Admin
    </span>
  )
  return null
}

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { isAuthenticated, user } = useSelector((state) => state.auth)
  const { items: cartItems } = useSelector((state) => state.cart)
  const { items: wishlistItems } = useSelector((state) => state.wishlist)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const handleLogout = () => {
    dispatch(logout())
    toast.success('Logged out successfully')
    navigate('/')
    setIsMenuOpen(false)
  }

  const isAdmin = user?.role === 'admin'

  return (
    <nav className="bg-gray-900/95 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="font-black text-xl text-white">OtakuReads</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className={`text-sm font-medium transition-colors ${isActive('/') ? 'text-purple-400' : 'text-gray-300 hover:text-white'}`}>Home</Link>
            <Link to="/books" className={`text-sm font-medium transition-colors ${isActive('/books') ? 'text-purple-400' : 'text-gray-300 hover:text-white'}`}>Books</Link>
            {isAuthenticated && isAdmin && (
              <Link to="/admin" className={`text-sm font-medium transition-colors ${isActive('/admin') ? 'text-purple-400' : 'text-gray-300 hover:text-white'}`}>Admin</Link>
            )}

            <div className="flex items-center gap-3 ml-2">
              {isAuthenticated ? (
                <>
                  {/* Wishlist */}
                  <Link to="/wishlist" className="relative p-2 text-gray-400 hover:text-yellow-400 transition-colors">
                    <Bookmark size={20} />
                    {wishlistItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                        {wishlistItems.length}
                      </span>
                    )}
                  </Link>
                  {/* Cart */}
                  <Link to="/cart" className="relative p-2 text-gray-400 hover:text-purple-400 transition-colors">
                    <ShoppingCart size={20} />
                    {cartItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                        {cartItems.length}
                      </span>
                    )}
                  </Link>
                  {/* Profile */}
                  <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors border border-gray-700">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm text-gray-300 max-w-20 truncate">{user?.name}</span>
                    <RoleBadge role={user?.role} />
                  </Link>
                  {/* Logout */}
                  <button onClick={handleLogout} aria-label="Logout" className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                    <LogOut size={18} />
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Login</Link>
                  <Link to="/register" className="text-sm font-semibold px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:opacity-90 transition-opacity">
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 text-gray-400 hover:text-white transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-800 py-4 space-y-1">
            {[
              { to: '/', label: 'Home' },
              { to: '/books', label: 'Books' },
              ...(isAuthenticated && isAdmin ? [{ to: '/admin', label: 'Admin Dashboard' }] : []),
              ...(isAuthenticated ? [
                { to: '/wishlist', label: `Wishlist (${wishlistItems.length})` },
                { to: '/cart', label: `Cart (${cartItems.length})` },
                { to: '/profile', label: 'My Profile' },
              ] : []),
            ].map(({ to, label }) => (
              <Link key={to} to={to}
                className={`block px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isActive(to) ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
                onClick={() => setIsMenuOpen(false)}>
                {label}
              </Link>
            ))}

            {isAuthenticated ? (
              <button onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                Logout
              </button>
            ) : (
              <div className="flex gap-3 px-4 pt-2">
                <Link to="/login" onClick={() => setIsMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm font-medium text-gray-300 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors">
                  Login
                </Link>
                <Link to="/register" onClick={() => setIsMenuOpen(false)}
                  className="flex-1 text-center py-2 text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:opacity-90 transition-opacity">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
