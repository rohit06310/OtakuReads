// API utility functions for backend communication

const API_BASE_URL = 'http://localhost:5000/api';

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    console.log(`Making API request to: ${url}`, config);
    
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Check backend health
export const checkBackendHealth = async () => {
  try {
    const data = await apiRequest('/health');
    console.log('Backend health check:', data);
    return data;
  } catch (error) {
    console.error('Backend health check failed:', error);
    throw new Error('Backend server is not available');
  }
};

// Create Razorpay order
export const createOrder = async (orderData) => {
  try {
    const data = await apiRequest('/create-order', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return data.order;
  } catch (error) {
    console.error('Failed to create order:', error);
    throw error;
  }
};

// Verify payment
export const verifyPayment = async (paymentData) => {
  try {
    const data = await apiRequest('/verify-payment', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    return data;
  } catch (error) {
    console.error('Failed to verify payment:', error);
    throw error;
  }
};

// Get payment details
export const getPaymentDetails = async (paymentId) => {
  try {
    const data = await apiRequest(`/payment/${paymentId}`);
    return data.payment;
  } catch (error) {
    console.error('Failed to get payment details:', error);
    throw error;
  }
};

export default {
  checkBackendHealth,
  createOrder,
  verifyPayment,
  getPaymentDetails,
};