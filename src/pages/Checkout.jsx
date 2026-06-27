import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { createOrderThunk } from '../store/orderSlice'
import { clearCart } from '../store/cartSlice'
import { CreditCard, Shield, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { checkBackendHealth, createRazorpayOrder, verifyPayment } from '../lib/api'
import { loadRazorpayScript } from '../lib/razorpay'


const Checkout = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { items, total } = useSelector((state) => state.cart)
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const { appliedCoupon } = useSelector((state) => state.coupons)
  const [isProcessing, setIsProcessing] = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking')

  const finalTotal = appliedCoupon ? total - appliedCoupon.discountValue : total

  useEffect(() => {
    if (!isAuthenticated) return navigate('/login')
    if (items.length === 0) return navigate('/cart')

    const checkBackend = async () => {
      try {
        await checkBackendHealth()
        setBackendStatus('connected')
      } catch (error) {
        setBackendStatus('error')
        toast.error('Payment service is currently unavailable.')
      }
    }
    checkBackend()
  }, [isAuthenticated, items.length, navigate])

  const handlePayment = async () => {
    if (backendStatus !== 'connected') {
      return toast.error('Payment service is not available.')
    }
    setIsProcessing(true)

    try {
      // 0. Load Razorpay script
      const isScriptLoaded = await loadRazorpayScript()
      if (!isScriptLoaded) {
        setIsProcessing(false)
        return toast.error('Failed to load Razorpay SDK. Please check your internet connection.')
      }

      // 1. Create Razorpay order via backend
      const rzpOrder = await createRazorpayOrder({ amount: finalTotal })

      // 2. Open Razorpay Checkout modal
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_RJLHxKNEwgqwwy',
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'OtakuReads',
        description: 'Book Purchase',
        order_id: rzpOrder.id,
        handler: async (response) => {
          try {
            // 3. Verify payment signature
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })

            // 4. Create actual order in database
            const orderData = {
              items: items.map(i => ({ book: i._id || i.id, quantity: i.quantity, price: i.price })),
              total: finalTotal,
              paymentMethod: 'Razorpay',
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              couponCode: appliedCoupon?.code
            }

            const res = await dispatch(createOrderThunk(orderData))
            if (createOrderThunk.fulfilled.match(res)) {
              dispatch(clearCart())
              toast.success('Payment successful! Order placed.')
              navigate('/profile')
            } else {
               toast.error('Failed to create order in database.')
            }
          } catch (err) {
            toast.error('Payment verification failed. Please contact support.')
          } finally {
            setIsProcessing(false)
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: { color: '#3b82f6' }
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (response) {
        toast.error(response.error.description || 'Payment failed.')
        setIsProcessing(false)
      })
      rzp.open()

    } catch (error) {
      toast.error('Failed to initialize payment.')
      setIsProcessing(false)
    }
  }

  if (!isAuthenticated || items.length === 0) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Review your order and complete your purchase</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {items.map((item) => (
                <div key={item._id || item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <img src={item.coverImage} alt={item.title} className="w-16 h-20 object-cover rounded" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 line-clamp-1">{item.title}</h3>
                    <p className="text-sm text-gray-600">by {item.author}</p>
                    <p className="text-blue-600 font-semibold mt-1">₹{item.price}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    <p className="font-semibold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-6 pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({appliedCoupon.code}):</span>
                  <span>-₹{appliedCoupon.discountValue.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span className="text-blue-600">₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 h-fit">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-blue-500" /> Payment Details
            </h2>
            <div className="p-4 border-2 border-blue-100 bg-blue-50 rounded-lg mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-900">Razorpay Payment</span>
                <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded text-xs font-semibold text-green-700">
                  <Shield size={12} /> Secure
                </div>
              </div>
              <p className="text-sm text-blue-700 mb-3">Pay securely with UPI, Cards, Net Banking, and Wallets.</p>
              <div className="flex items-center gap-2 text-sm font-medium">
                {backendStatus === 'checking' && <><span className="text-blue-600">Connecting...</span></>}
                {backendStatus === 'connected' && <><CheckCircle size={16} className="text-green-600" /><span className="text-green-600">Service ready</span></>}
                {backendStatus === 'error' && <><AlertCircle size={16} className="text-red-600" /><span className="text-red-600">Service unavailable</span></>}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <Lock size={16} /> Your payment info is secure and encrypted.
            </div>

            <button onClick={handlePayment} disabled={isProcessing || backendStatus !== 'connected'}
              className="w-full py-4 rounded-lg font-semibold text-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isProcessing ? 'Processing...' : <><CreditCard size={20} /> Pay ₹{finalTotal.toFixed(2)}</>}
            </button>
            <p className="text-xs text-gray-500 mt-4 text-center">By completing your purchase, you agree to our Terms of Service.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout