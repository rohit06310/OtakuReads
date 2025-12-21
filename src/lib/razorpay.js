// Razorpay utility functions and configuration
import { getEnvVar } from './env'
import { checkBackendHealth, createOrder, verifyPayment } from './api'

// Razorpay configuration
const RAZORPAY_KEY_ID = getEnvVar('VITE_RAZORPAY_KEY_ID')

console.log('Razorpay Key ID:', RAZORPAY_KEY_ID) // Debug log

// Load Razorpay script
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // Check if Razorpay is already loaded
    if (window.Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => {
      console.log('Razorpay script loaded successfully')
      resolve(true)
    }
    script.onerror = () => {
      console.error('Failed to load Razorpay script')
      resolve(false)
    }
    document.body.appendChild(script)
  })
}

// Create Razorpay order via backend API
export const createRazorpayOrder = async (orderData) => {
  try {
    console.log('Creating order via backend API:', orderData);
    
    // Check if backend is available first
    await checkBackendHealth();
    
    const order = await createOrder(orderData);
    console.log('Order created successfully via backend:', order);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
}

// Initialize Razorpay payment
export const initiateRazorpayPayment = async ({ 
  amount, 
  currency = 'INR', 
  receipt, 
  user, 
  onSuccess, 
  onError 
}) => {
  try {
    console.log('Initializing payment with amount:', amount)
    
    // Validate required parameters
    if (!RAZORPAY_KEY_ID) {
      throw new Error('Razorpay Key ID is not configured')
    }
    
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount')
    }

    // Load Razorpay script
    const isScriptLoaded = await loadRazorpayScript()
    if (!isScriptLoaded) {
      throw new Error('Failed to load Razorpay script')
    }

    // Create order (in real app, this would call your backend)
    const orderData = await createRazorpayOrder({
      amount,
      currency,
      receipt
    })

    console.log('Order data:', orderData)

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'E-Book Store',
      description: 'Purchase E-Books',
      image: '/logo.png', // Add your logo
      order_id: orderData.id,
      handler: function (response) {
        console.log('Payment successful:', response)
        // Payment successful
        const paymentData = {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        }
        onSuccess(paymentData)
      },
      prefill: {
        name: user?.email?.split('@')[0] || 'Customer',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      notes: {
        address: 'E-Book Store Corporate Office',
      },
      theme: {
        color: '#3B82F6', // Blue color to match your theme
      },
      modal: {
        ondismiss: function() {
          console.log('Payment modal dismissed')
          onError(new Error('Payment cancelled by user'))
        }
      }
    }

    console.log('Razorpay options:', options)

    const rzp = new window.Razorpay(options)
    
    rzp.on('payment.failed', function (response) {
      console.error('Payment failed:', response.error)
      onError(new Error(response.error.description || 'Payment failed'))
    })

    rzp.open()
  } catch (error) {
    console.error('Payment initialization error:', error)
    onError(error)
  }
}

// Verify payment signature via backend API
export const verifyPaymentSignature = async (paymentData) => {
  try {
    console.log('Verifying payment via backend API:', paymentData);
    
    const data = await verifyPayment(paymentData);
    
    console.log('Payment verified successfully via backend:', data);
    return {
      verified: true,
      ...paymentData,
      ...data
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return {
      verified: false,
      error: error.message
    };
  }
}

// Format amount for display
export const formatAmount = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount)
}

// Generate receipt number
export const generateReceipt = () => {
  return `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
