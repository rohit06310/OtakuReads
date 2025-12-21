import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { createOrder } from '../store/orderSlice'
import { clearCart } from '../store/cartSlice'
import { CreditCard, Shield, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { initiateRazorpayPayment, verifyPaymentSignature, generateReceipt } from '../lib/razorpay'
import { checkBackendHealth } from '../lib/api'

const Checkout = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { items, total } = useSelector((state) => state.cart)
  const { user, isAuthenticated } = useSelector((state) => state.auth)
  const [isProcessing, setIsProcessing] = useState(false)
  const [backendStatus, setBackendStatus] = useState('checking') // 'checking', 'connected', 'error'

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (items.length === 0) {
      navigate('/cart')
      return
    }

    // Check backend connectivity
    const checkBackend = async () => {
      try {
        await checkBackendHealth()
        setBackendStatus('connected')
        console.log('Backend is connected and ready')
      } catch (error) {
        setBackendStatus('error')
        console.error('Backend connectivity check failed:', error)
        toast.error('Payment service is currently unavailable. Please try again later.')
      }
    }

    checkBackend()
  }, [isAuthenticated, items.length, navigate])

  const handlePayment = async () => {
    if (backendStatus !== 'connected') {
      toast.error('Payment service is not available. Please try again later.')
      return
    }

    setIsProcessing(true)
    
    try {
      const receipt = generateReceipt()
      
      console.log('Starting payment process with total:', total)
      
      await initiateRazorpayPayment({
        amount: total,
        currency: 'INR',
        receipt: receipt,
        user: user,
        onSuccess: async (paymentData) => {
          try {
            console.log('Payment success callback triggered:', paymentData)
            
            // Verify payment signature via backend
            const verificationResult = await verifyPaymentSignature(paymentData)
            
            if (verificationResult.verified) {
              // Create order with payment details
              const orderData = {
                userId: user.id,
                items: items,
                total: total,
                paymentMethod: 'Razorpay',
                paymentStatus: 'completed',
                paymentId: paymentData.razorpay_payment_id,
                orderId: paymentData.razorpay_order_id,
                receipt: receipt,
                signature: paymentData.razorpay_signature,
              }
              
              dispatch(createOrder(orderData))
              dispatch(clearCart())
              
              toast.success('Payment successful! Order placed.')
              navigate('/profile?tab=library')
            } else {
              toast.error('Payment verification failed. Please contact support.')
            }
          } catch (error) {
            console.error('Post-payment processing error:', error)
            toast.error('Order creation failed. Please contact support.')
          } finally {
            setIsProcessing(false)
          }
        },
        onError: (error) => {
          console.error('Payment error:', error)
          let errorMessage = 'Payment failed. Please try again.'
          
          if (error.message.includes('Backend server is not available')) {
            errorMessage = 'Payment service is currently unavailable. Please try again later.'
          } else if (error.message.includes('cancelled by user')) {
            errorMessage = 'Payment was cancelled.'
          } else if (error.message) {
            errorMessage = error.message
          }
          
          toast.error(errorMessage)
          setIsProcessing(false)
        }
      })
    } catch (error) {
      console.error('Payment initialization error:', error)
      let errorMessage = 'Failed to initialize payment. Please try again.'
      
      if (error.message.includes('Backend server is not available')) {
        errorMessage = 'Payment service is currently unavailable. Please try again later.'
        setBackendStatus('error')
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage)
      setIsProcessing(false)
    }
  }

  if (!isAuthenticated || items.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Review your order and complete your purchase</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="w-16 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600">by {item.author}</p>
                      <p className="text-blue-600 font-semibold">₹{item.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t mt-6 pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-blue-600">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                Payment Details
              </h2>
              
              <div className="space-y-4 mb-6">
                <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900">Razorpay Payment</span>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">Secure</span>
                    </div>
                  </div>
                  <p className="text-sm text-blue-700 mb-2">
                    Pay securely with UPI, Cards, Net Banking, and Wallets
                  </p>
                  
                  {/* Backend Status Indicator */}
                  <div className="flex items-center gap-2 text-xs">
                    {backendStatus === 'checking' && (
                      <>
                        <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-blue-600">Connecting to payment service...</span>
                      </>
                    )}
                    {backendStatus === 'connected' && (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-green-600">Payment service ready</span>
                      </>
                    )}
                    {backendStatus === 'error' && (
                      <>
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        <span className="text-red-600">Payment service unavailable</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                  <Lock className="w-4 h-4" />
                  <span>Your payment information is secure and encrypted</span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={isProcessing || backendStatus !== 'connected'}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                  isProcessing || backendStatus !== 'connected'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white flex items-center justify-center gap-2`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : backendStatus === 'checking' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : backendStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Service Unavailable
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pay ₹{total.toFixed(2)} with Razorpay
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 mt-4 text-center">
                By completing your purchase, you agree to our Terms of Service and acknowledge our Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout