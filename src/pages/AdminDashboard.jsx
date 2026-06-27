import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { createBookThunk, updateBookThunk, deleteBookThunk, fetchBooksThunk } from '../store/bookSlice'
import { fetchAllOrdersThunk, updateOrderStatusThunk } from '../store/orderSlice'
import { fetchCouponsThunk, createCouponThunk } from '../store/couponSlice'
import { getAllUsers, updateUserRole, banUnbanUser, uploadPdf } from '../lib/api'
import {
  Book, BookOpen, Plus, Edit, Trash2, Users, ShoppingBag, DollarSign, Shield, Ban,
  Upload, FileText, X, CheckCircle, AlertCircle, Loader, Ticket
} from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  title: '', author: '', price: '', coverImage: '', description: '', preview: '', category: 'Shonen', pages: '', pdfUrl: null,
}

const AdminDashboard = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const { books } = useSelector((state) => state.books)
  const { allOrders } = useSelector((state) => state.orders)
  const { coupons } = useSelector((state) => state.coupons)

  const [activeTab, setActiveTab] = useState('overview')
  const [allUsers, setAllUsers] = useState([])
  
  // Book Form State
  const [showBookForm, setShowBookForm] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)

  // Coupon Form State
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [couponData, setCouponData] = useState({ code: '', discountValue: '', minOrderAmount: '0', expiresAt: '' })

  // PDF upload state
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [uploadStatus, setUploadStatus] = useState('idle')
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState(null)
  const pdfInputRef = useRef(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') navigate('/')
    dispatch(fetchBooksThunk())
    dispatch(fetchAllOrdersThunk())
    dispatch(fetchCouponsThunk())
    loadUsers()
  }, [isAuthenticated, user, navigate, dispatch])

  const loadUsers = async () => {
    try {
      const data = await getAllUsers()
      setAllUsers(data.users)
    } catch (err) {
      toast.error('Failed to load users')
    }
  }

  const handleRoleUpdate = async (userId, newRole) => {
    if (!isAdmin) return toast.error('Only admins can change roles')
    try {
      await updateUserRole(userId, newRole)
      toast.success('Role updated')
      loadUsers()
    } catch (err) {
      toast.error('Failed to update role')
    }
  }

  const handleBanUser = async (userId, currentStatus) => {
    if (!isAdmin) return toast.error('Only admins can ban users')
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned'
    try {
      await banUnbanUser(userId, newStatus)
      toast.success(newStatus === 'active' ? 'User unbanned' : 'User banned')
      loadUsers()
    } catch (err) {
      toast.error('Failed to update ban status')
    }
  }

  const handleOrderStatus = async (orderId, status) => {
    await dispatch(updateOrderStatusThunk({ id: orderId, status }))
    toast.success(`Order marked as ${status}`)
  }

  const resetBookForm = () => {
    setFormData(EMPTY_FORM)
    setSelectedPdf(null)
    setUploadStatus('idle')
    setUploadedPdfUrl(null)
    setEditingBook(null)
    setShowBookForm(false)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }

  const handlePdfSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') return toast.error('Only PDF files allowed')
    
    setSelectedPdf(file)
    setUploadStatus('uploading')
    try {
      const result = await uploadPdf(file)
      setUploadedPdfUrl(result.pdfUrl)
      setUploadStatus('done')
      toast.success('PDF uploaded!')
    } catch (error) {
      setUploadStatus('error')
      toast.error('Upload failed')
    }
  }

  const handleBookSubmit = async (e) => {
    e.preventDefault()
    if (uploadStatus === 'uploading') return toast.error('Wait for PDF upload')

    const bookData = {
      ...formData,
      price: parseFloat(formData.price),
      pages: parseInt(formData.pages) || 200,
      pdfUrl: uploadedPdfUrl || formData.pdfUrl || null,
    }

    if (editingBook) {
      await dispatch(updateBookThunk({ id: editingBook._id, ...bookData }))
      toast.success('Book updated')
    } else {
      await dispatch(createBookThunk(bookData))
      toast.success('Book added')
    }
    resetBookForm()
  }

  const handleEditBook = (book) => {
    setEditingBook(book)
    setFormData({ ...book, price: book.price.toString(), pages: book.pages.toString() })
    if (book.pdfUrl) {
      setUploadedPdfUrl(book.pdfUrl)
      setUploadStatus('done')
    }
    setShowBookForm(true)
  }

  const handleCouponSubmit = async (e) => {
    e.preventDefault()
    await dispatch(createCouponThunk({
      ...couponData,
      discountValue: Number(couponData.discountValue),
      minOrderAmount: Number(couponData.minOrderAmount)
    }))
    toast.success('Coupon created')
    setShowCouponForm(false)
  }

  if (!isAuthenticated || user?.role !== 'admin') return null

  const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total || 0), 0)

  // Group orders by last 7 days for the chart
  const getLast7DaysSales = () => {
    const salesMap = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      salesMap[dateStr] = 0
    }
    
    allOrders.forEach(order => {
      const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (salesMap[orderDate] !== undefined) {
        salesMap[orderDate] += (order.total || 0)
      }
    })
    
    return Object.entries(salesMap).map(([date, revenue]) => ({ date, revenue }))
  }
  
  const last7DaysSales = getLast7DaysSales()
  const maxRevenue = Math.max(...last7DaysSales.map(s => s.revenue), 100)
  const chartWidth = 500
  const chartHeight = 200
  const paddingLeft = 50
  const paddingRight = 20
  const paddingTop = 20
  const paddingBottom = 40
  
  const points = last7DaysSales.map((s, idx) => {
    const x = paddingLeft + (idx / 6) * (chartWidth - paddingLeft - paddingRight)
    const y = chartHeight - paddingBottom - (s.revenue / maxRevenue) * (chartHeight - paddingTop - paddingBottom)
    return { x, y, ...s }
  })
  
  const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`
    : ''

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">Manage store, users, and orders</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 sticky top-24 space-y-2">
              {[
                { id: 'overview', label: 'Overview', icon: Book },
                { id: 'books', label: 'Books', icon: BookOpen },
                { id: 'orders', label: 'Orders', icon: ShoppingBag },
                { id: 'users', label: 'Users', icon: Users },
                { id: 'coupons', label: 'Coupons', icon: Ticket },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-sm ${
                    activeTab === id ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  <Icon size={18} /> {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard icon={Book} label="Total Books" value={books.length} color="blue" />
                  <StatCard icon={Users} label="Total Users" value={allUsers.length} color="green" />
                  <StatCard icon={ShoppingBag} label="Total Orders" value={allOrders.length} color="purple" />
                  <StatCard icon={DollarSign} label="Total Revenue" value={`₹${totalRevenue.toFixed(2)}`} color="yellow" />
                </div>
                
                {/* Premium Animated SVG Sales Chart */}
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-950">Weekly Revenue Flow</h2>
                      <p className="text-xs text-gray-500">Visualizing sales performance over the last 7 days</p>
                    </div>
                    <span className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full font-semibold border border-purple-100 flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Live Updates
                    </span>
                  </div>
                  
                  <div className="w-full h-[240px] flex items-center justify-center">
                    <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="chart-line-grad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid Lines */}
                      <line x1="50" y1="20" x2="480" y2="20" stroke="#f3f4f6" strokeWidth="1" />
                      <line x1="50" y1="90" x2="480" y2="90" stroke="#f3f4f6" strokeWidth="1" />
                      <line x1="50" y1="160" x2="480" y2="160" stroke="#e5e7eb" strokeWidth="1" />
                      
                      {/* Area Fill */}
                      {areaPath && (
                        <path d={areaPath} fill="url(#chart-area-grad)" className="transition-all duration-700 ease-out" />
                      )}
                      
                      {/* Line Stroke */}
                      {linePath && (
                        <path d={linePath} fill="none" stroke="url(#chart-line-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="transition-all duration-700 ease-out" />
                      )}
                      
                      {/* Nodes (Circles) */}
                      {points.map((p, idx) => (
                        <g key={idx} className="group/node cursor-pointer">
                          <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#a855f7" strokeWidth="3" className="hover:scale-150 hover:fill-purple-600 transition-all duration-200" />
                          
                          {/* Value tooltip on hover */}
                          <g className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-200">
                            <rect x={p.x - 35} y={p.y - 28} width="70" height="18" rx="4" fill="#1e1b4b" />
                            <text x={p.x} y={p.y - 16} fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">₹{p.revenue.toFixed(0)}</text>
                          </g>
                        </g>
                      ))}
                      
                      {/* X-Axis Labels */}
                      {points.map((p, idx) => (
                        <text key={idx} x={p.x} y="180" fill="#9ca3af" fontSize="9" fontWeight="500" textAnchor="middle">
                          {p.date}
                        </text>
                      ))}
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'books' && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Manage Books</h2>
                  <button onClick={() => setShowBookForm(true)} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm transition-colors">
                    <Plus size={16} /> Add Book
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {books.map(book => (
                        <tr key={book._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap flex items-center gap-3">
                            <img src={book.coverImage} className="w-10 h-14 object-cover rounded shadow-sm" />
                            <div>
                              <div className="font-medium text-gray-900">{book.title}</div>
                              <div className="text-gray-500 text-xs">{book.author}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap"><span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{book.category}</span></td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">₹{book.price}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {book.pdfUrl ? <CheckCircle size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-yellow-500" />}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                            <button onClick={() => handleEditBook(book)} className="p-2 text-blue-600 rounded hover:bg-blue-50"><Edit size={16} /></button>
                            <button onClick={() => { if(confirm('Delete?')) dispatch(deleteBookThunk(book._id)) }} className="p-2 text-red-600 rounded hover:bg-red-50"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Manage Users</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {allUsers.map(u => (
                        <tr key={u._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{u.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">{u.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select disabled={!isAdmin || u._id === user._id} value={u.role} onChange={(e) => handleRoleUpdate(u._id, e.target.value)}
                              className="bg-white border border-gray-300 rounded px-2 py-1 text-sm text-gray-700">
                              <option value="reader">Reader</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {u.status === 'banned' ? <span className="text-red-700 text-xs font-medium bg-red-100 px-2 py-1 rounded-full">Banned</span> : <span className="text-green-700 text-xs font-medium bg-green-100 px-2 py-1 rounded-full">Active</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button disabled={!isAdmin || u._id === user._id} onClick={() => handleBanUser(u._id, u.status)}
                              className={`px-3 py-1 rounded text-xs font-medium ${u.status === 'banned' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'} disabled:opacity-50 transition-colors`}>
                              {u.status === 'banned' ? 'Unban' : 'Ban'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Manage Orders</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                      {allOrders.map(o => (
                        <tr key={o._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-600">{o._id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">₹{(o.total || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${o.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{o.status}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {o.status === 'processing' && (
                              <button onClick={() => handleOrderStatus(o._id, 'completed')} className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">Mark Completed</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'coupons' && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Coupons</h2>
                  <button onClick={() => setShowCouponForm(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"><Plus size={16}/> Create Coupon</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coupons.map(c => (
                    <div key={c._id} className="border border-blue-200 bg-blue-50 rounded-lg p-4 shadow-sm">
                      <div className="font-mono font-bold text-lg text-blue-900 mb-1">{c.code}</div>
                      <div className="text-blue-700 font-medium mb-2">₹{c.discountValue} OFF</div>
                      <div className="text-xs text-blue-600/80">Min Order: ₹{c.minOrderAmount}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Book Form Modal */}
      {showBookForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{editingBook ? 'Edit Book' : 'Add Book'}</h2>
              <button onClick={resetBookForm} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Title" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="bg-white border border-gray-300 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                <input required placeholder="Author" value={formData.author} onChange={e=>setFormData({...formData, author: e.target.value})} className="bg-white border border-gray-300 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                <input required type="number" placeholder="Price" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="bg-white border border-gray-300 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                <select value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="bg-white border border-gray-300 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  {['Shonen', 'Shojo', 'Seinen', 'Slice of Life', 'Isekai'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input required placeholder="Cover Image URL" value={formData.coverImage} onChange={e=>setFormData({...formData, coverImage: e.target.value})} className="bg-white border border-gray-300 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                <input type="number" placeholder="Pages" value={formData.pages} onChange={e=>setFormData({...formData, pages: e.target.value})} className="bg-white border border-gray-300 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <textarea placeholder="Description" rows={3} value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              
              <div className="border border-gray-300 p-4 rounded-lg bg-gray-50">
                <label className="block text-sm text-gray-600 mb-2">Upload PDF</label>
                {uploadStatus === 'idle' && <input type="file" accept=".pdf" onChange={handlePdfSelect} className="text-gray-700 text-sm" />}
                {uploadStatus === 'uploading' && <span className="text-blue-600 flex items-center gap-2"><Loader size={16} className="animate-spin"/> Uploading...</span>}
                {uploadStatus === 'done' && <span className="text-green-600 flex items-center gap-2"><CheckCircle size={16}/> PDF Attached!</span>}
              </div>

              <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                {editingBook ? 'Update Book' : 'Create Book'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {showCouponForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-lg w-full max-w-md p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Coupon</h2>
            <form onSubmit={handleCouponSubmit} className="space-y-4">
              <input required placeholder="CODE (e.g. SUMMER20)" value={couponData.code} onChange={e=>setCouponData({...couponData, code: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-lg uppercase focus:ring-2 focus:ring-blue-500 outline-none" />
              <input required type="number" placeholder="Discount Amount (₹)" value={couponData.discountValue} onChange={e=>setCouponData({...couponData, discountValue: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <input required type="number" placeholder="Min Order Amount (₹)" value={couponData.minOrderAmount} onChange={e=>setCouponData({...couponData, minOrderAmount: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <input required type="date" value={couponData.expiresAt} onChange={e=>setCouponData({...couponData, expiresAt: e.target.value})} className="w-full bg-white border border-gray-300 text-gray-900 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">Create</button>
                <button type="button" onClick={()=>setShowCouponForm(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium border border-gray-300 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: 'text-blue-600 bg-blue-100', green: 'text-green-600 bg-green-100',
    purple: 'text-purple-600 bg-purple-100', yellow: 'text-yellow-600 bg-yellow-100'
  }
  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 flex items-center gap-4">
      <div className={`p-4 rounded-lg ${colors[color]}`}><Icon size={24} /></div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm font-medium text-gray-500">{label}</div>
      </div>
    </div>
  )
}

export default AdminDashboard