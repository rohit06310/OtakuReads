import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { fetchMyOrdersThunk } from '../store/orderSlice'
import { fetchBooksThunk } from '../store/bookSlice'
import {
  User, BookOpen, ShoppingBag, Download, Calendar,
  FileText, AlertCircle, Loader, CheckCircle, Edit3, Printer, X
} from 'lucide-react'
import toast from 'react-hot-toast'

const API_BASE_URL = 'http://localhost:5000/api'

const Profile = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile')
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const { orders, loading: ordersLoading } = useSelector((state) => state.orders)
  const { books } = useSelector((state) => state.books)

  const [downloadStates, setDownloadStates] = useState({})
  const [selectedBookForReading, setSelectedBookForReading] = useState(null)

  useEffect(() => {
    if (!selectedBookForReading) return
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && ['s', 'p', 'u'].includes(e.key.toLowerCase())) || e.key === 'F12') {
        e.preventDefault()
        toast.error("Downloads and printing are disabled in the secure online reader.")
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBookForReading])

  const handlePrintReceipt = (order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900')
    if (!printWindow) {
      toast.error('Popup blocker enabled. Please allow popups to print receipts.')
      return
    }
    
    const orderDate = new Date(order.createdAt).toLocaleDateString()
    const orderId = order._id.toUpperCase()
    const totalAmount = (order.total || 0).toFixed(2)
    
    let itemsHtml = ''
    order.items.forEach((item, idx) => {
      const title = item.book?.title || `Book ID: ${item.book}`
      const price = item.price.toFixed(2)
      itemsHtml += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 0; text-align: left;">${idx + 1}. ${title}</td>
          <td style="padding: 12px 0; text-align: center;">${item.quantity}</td>
          <td style="padding: 12px 0; text-align: right; font-weight: 600;">₹${price}</td>
        </tr>
      `
    })

    const htmlContent = `
      <html>
        <head>
          <title>OtakuReads - Order Invoice #${orderId.slice(-6)}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; color: #1f2937; margin: 0; padding: 40px; background-color: #ffffff; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #a855f7; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: 900; color: #7c3aed; }
            .invoice-title { font-size: 28px; font-weight: 800; text-align: right; }
            .meta-details { display: flex; justify-content: space-between; margin-bottom: 40px; font-size: 14px; line-height: 1.6; }
            .bill-to { font-weight: 700; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
            th { border-bottom: 2px solid #e5e7eb; padding: 12px 0; font-weight: 700; text-transform: uppercase; font-size: 12px; color: #6b7280; }
            .totals { display: flex; flex-direction: column; align-items: flex-end; font-size: 16px; line-height: 2; }
            .totals-row { display: flex; justify-content: space-between; width: 250px; }
            .grand-total { font-size: 20px; font-weight: 800; border-top: 2px solid #a855f7; padding-top: 10px; margin-top: 10px; color: #7c3aed; }
            .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 60px; text-align: center; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">OtakuReads Store</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Digital Manga & Light Novels</div>
            </div>
            <div class="invoice-title">INVOICE</div>
          </div>
          
          <div class="meta-details">
            <div>
              <span class="bill-to">Billed To:</span><br/>
              Name: ${user?.name || 'Customer'}<br/>
              Email: ${user?.email || ''}
            </div>
            <div style="text-align: right;">
              <strong>Invoice #:</strong> ${orderId}<br/>
              <strong>Date:</strong> ${orderDate}<br/>
              <strong>Payment:</strong> Razorpay UPI/Card
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Product Details</th>
                <th style="width: 80px; text-align: center;">Qty</th>
                <th style="width: 120px; text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <span style="color: #6b7280;">Subtotal:</span>
              <span>₹${totalAmount}</span>
            </div>
            <div class="totals-row">
              <span style="color: #6b7280;">Tax (0% GST):</span>
              <span>₹0.00</span>
            </div>
            <div class="totals-row grand-total">
              <span>Total Paid:</span>
              <span>₹${totalAmount}</span>
            </div>
          </div>
          
          <div class="footer">
            Thank you for your purchase from OtakuReads! Happy Reading!<br/>
            This is a system-generated document. No signature required.
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    } else {
      dispatch(fetchMyOrdersThunk())
      if (books.length === 0) dispatch(fetchBooksThunk())
    }
  }, [isAuthenticated, navigate, dispatch, books.length])

  if (!isAuthenticated) return null

  // Collect unique purchased books from populated order history
  const purchasedBooksMap = new Map();
  orders
    .filter(o => o.status === 'completed' || o.status === 'processing')
    .flatMap(order => order.items)
    .forEach(item => {
      if (item.book && typeof item.book === 'object') {
        purchasedBooksMap.set(item.book._id, item.book);
      } else if (item.book) {
        const found = books.find(b => b._id === item.book);
        if (found) purchasedBooksMap.set(found._id, found);
      }
    });

  const purchasedBooks = Array.from(purchasedBooksMap.values());

  const handleDownload = async (book) => {
    if (!book.pdfUrl) {
      toast.error('PDF not available yet.')
      return
    }

    setDownloadStates(prev => ({ ...prev, [book._id]: 'downloading' }))

    try {
      const filename = book.pdfUrl.split('/').pop()
      const downloadUrl = `${API_BASE_URL}/download/${encodeURIComponent(filename)}`

      const response = await fetch(downloadUrl)
      if (!response.ok) throw new Error(`Server returned ${response.status}`)

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(objectUrl)

      setDownloadStates(prev => ({ ...prev, [book._id]: 'done' }))
      toast.success(`"${book.title}" downloaded successfully!`)

      setTimeout(() => setDownloadStates(prev => ({ ...prev, [book._id]: 'idle' })), 3000)
    } catch (error) {
      console.error('Download error:', error)
      setDownloadStates(prev => ({ ...prev, [book._id]: 'error' }))
      toast.error(`Download failed: ${error.message}`)
      setTimeout(() => setDownloadStates(prev => ({ ...prev, [book._id]: 'idle' })), 4000)
    }
  }

  const renderDownloadButton = (book) => {
    const state = downloadStates[book._id] || 'idle'

    if (!book.pdfUrl) {
      return (
        <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-800 text-gray-500 text-sm font-medium border border-gray-700">
          <AlertCircle className="w-4 h-4 text-yellow-500" /> Coming Soon
        </div>
      )
    }

    if (state === 'downloading') {
      return (
        <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-900/50 text-purple-400 text-sm font-medium border border-purple-500/30">
          <Loader className="w-4 h-4 animate-spin" /> Downloading…
        </button>
      )
    }

    if (state === 'done') {
      return (
        <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-green-900/50 text-green-400 text-sm font-medium border border-green-500/30">
          <CheckCircle className="w-4 h-4" /> Downloaded!
        </button>
      )
    }

    return (
      <div className="flex gap-2">
        <button onClick={() => setSelectedBookForReading(book)} className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-purple-400 border border-purple-500/30 text-sm font-medium transition-colors">
          <BookOpen className="w-4 h-4" /> Read
        </button>
        <button onClick={() => handleDownload(book)} className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <Download className="w-4 h-4" /> PDF
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sticky top-24">
              <div className="text-center mb-8">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-black text-white shadow-lg shadow-purple-500/20">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-white mb-1 truncate">{user?.name}</h2>
                <p className="text-gray-400 text-sm truncate">{user?.email}</p>
                <div className="mt-3 inline-block px-3 py-1 bg-gray-800 border border-gray-700 rounded-full text-xs font-semibold text-gray-300 capitalize">
                  {user?.role}
                </div>
              </div>

              <nav className="space-y-2">
                {[
                  { id: 'profile', label: 'Overview', icon: User },
                  { id: 'library', label: 'My Library', icon: BookOpen },
                  { id: 'orders', label: 'Order History', icon: ShoppingBag },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                      activeTab === id ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-400 border border-purple-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent'
                    }`}>
                    <Icon size={18} /> {label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mx-auto mb-4"><BookOpen size={24} /></div>
                  <div className="text-3xl font-black text-white mb-1">{purchasedBooks.length}</div>
                  <div className="text-gray-400 text-sm font-medium">Books Owned</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center mx-auto mb-4"><ShoppingBag size={24} /></div>
                  <div className="text-3xl font-black text-white mb-1">{orders.length}</div>
                  <div className="text-gray-400 text-sm font-medium">Total Orders</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                  <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mx-auto mb-4"><Calendar size={24} /></div>
                  <div className="text-3xl font-black text-white mb-1">
                    ₹{orders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-sm font-medium">Total Spent</div>
                </div>
              </div>
            )}

            {activeTab === 'library' && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white">My Library</h2>
                </div>

                {purchasedBooks.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {purchasedBooks.map((book) => (
                      <div key={book._id} className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden hover:border-gray-600 transition-colors group">
                        <div className="relative aspect-[2/3] overflow-hidden">
                          <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80" />
                          <div className="absolute top-3 right-3">
                            {book.pdfUrl ? (
                              <span className="flex items-center gap-1 bg-green-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full"><FileText size={12} /> PDF</span>
                            ) : (
                              <span className="flex items-center gap-1 bg-yellow-500/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full"><AlertCircle size={12} /> Soon</span>
                            )}
                          </div>
                        </div>
                        <div className="p-5">
                          <h3 className="font-bold text-white mb-1 line-clamp-1">{book.title}</h3>
                          <p className="text-gray-400 text-sm mb-4">by {book.author}</p>
                          {renderDownloadButton(book)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700"><BookOpen size={32} className="text-gray-500" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">Your library is empty</h3>
                    <p className="text-gray-400 mb-6 max-w-sm mx-auto">Discover amazing stories and build your collection in our store.</p>
                    <button onClick={() => navigate('/books')} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
                      Browse Books
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Order History</h2>
                {ordersLoading ? (
                  <div className="flex justify-center py-12"><Loader className="w-8 h-8 text-purple-500 animate-spin" /></div>
                ) : orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order._id} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4 pb-4 border-b border-gray-700">
                          <div>
                            <h3 className="font-bold text-white text-lg">Order #{order._id.slice(-6).toUpperCase()}</h3>
                            <p className="text-gray-400 text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">₹{(order.total || 0).toFixed(2)}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-bold uppercase tracking-wider ${order.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                                {order.status}
                              </span>
                              <button onClick={() => handlePrintReceipt(order)} className="text-gray-400 hover:text-white p-1 rounded transition-colors" title="Print Invoice">
                                <Printer size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {order.items.map((item, idx) => {
                            const bookObj = typeof item.book === 'object' ? item.book : null;
                            const bookId = bookObj ? bookObj._id : item.book;
                            const title = bookObj ? bookObj.title : `Book ID: ${bookId}`;
                            const cover = bookObj ? bookObj.coverImage : null;
                            const author = bookObj ? bookObj.author : null;

                            return (
                              <div key={idx} className="flex justify-between items-center text-sm bg-gray-900/50 p-2.5 rounded-xl border border-gray-700/50">
                                <div className="flex items-center gap-3">
                                  {cover && (
                                    <img src={cover} alt={title} className="w-10 h-14 object-cover rounded-lg border border-gray-700" />
                                  )}
                                  <div>
                                    <div className="text-white font-bold">{title}</div>
                                    {author && <div className="text-xs text-gray-400">by {author}</div>}
                                    <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                                  </div>
                                </div>
                                <span className="text-purple-400 font-bold">₹{item.price}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700"><ShoppingBag size={32} className="text-gray-500" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">No orders yet</h3>
                    <p className="text-gray-400">When you buy a book, your order will appear here.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Secure PDF Reader Modal */}
      {selectedBookForReading && (
        <div onContextMenu={(e) => e.preventDefault()} className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {selectedBookForReading.title}
                <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full font-medium">Secured Reader</span>
              </h2>
              <p className="text-xs text-gray-400">by {selectedBookForReading.author}</p>
            </div>
            <button onClick={() => setSelectedBookForReading(null)} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
              <X size={24} />
            </button>
          </div>
          
          {/* PDF Viewer Frame */}
          <div className="flex-1 bg-gray-950 flex items-center justify-center relative">
            <iframe 
              src={`http://localhost:5000/uploads/${selectedBookForReading.pdfUrl.split('/').pop()}#toolbar=0`} 
              className="w-full h-full border-none"
              title="Secure E-Book Reader"
            />
            {/* Overlay to block click actions on external browser frames */}
            <div className="absolute inset-x-0 top-0 h-10 bg-transparent pointer-events-auto" />
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile