import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const registerUser = async (data) => {
  const res = await api.post('/auth/register', data);
  return res.data;
};

export const loginUser = async (data) => {
  const res = await api.post('/auth/login', data);
  return res.data;
};

export const getProfile = async () => {
  const res = await api.get('/auth/profile');
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await api.put('/auth/profile', data);
  return res.data;
};

// ─── Books ────────────────────────────────────────────────────────────────────
export const fetchBooks = async (params = {}) => {
  const res = await api.get('/books', { params });
  return res.data;
};

export const fetchBookById = async (id) => {
  const res = await api.get(`/books/${id}`);
  return res.data;
};

export const createBook = async (data) => {
  const res = await api.post('/books', data);
  return res.data;
};

export const updateBook = async (id, data) => {
  const res = await api.put(`/books/${id}`, data);
  return res.data;
};

export const deleteBook = async (id) => {
  const res = await api.delete(`/books/${id}`);
  return res.data;
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const createOrder = async (data) => {
  const res = await api.post('/orders', data);
  return res.data;
};

export const getMyOrders = async () => {
  const res = await api.get('/orders');
  return res.data;
};

export const getAllOrders = async () => {
  const res = await api.get('/orders/all');
  return res.data;
};

export const updateOrderStatus = async (id, status) => {
  const res = await api.put(`/orders/${id}/status`, { status });
  return res.data;
};

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const addReview = async (data) => {
  const res = await api.post('/reviews', data);
  return res.data;
};

export const getBookReviews = async (bookId) => {
  const res = await api.get(`/reviews/book/${bookId}`);
  return res.data;
};

export const deleteReview = async (id) => {
  const res = await api.delete(`/reviews/${id}`);
  return res.data;
};

// ─── Coupons ──────────────────────────────────────────────────────────────────
export const validateCoupon = async (code, orderAmount) => {
  const res = await api.post('/coupons/validate', { code, orderAmount });
  return res.data;
};

export const getCoupons = async () => {
  const res = await api.get('/coupons');
  return res.data;
};

export const createCoupon = async (data) => {
  const res = await api.post('/coupons', data);
  return res.data;
};

// ─── Users (Admin) ────────────────────────────────────────────────────────────
export const getAllUsers = async () => {
  const res = await api.get('/users');
  return res.data;
};

export const updateUserRole = async (id, role) => {
  const res = await api.put(`/users/${id}/role`, { role });
  return res.data;
};

export const banUnbanUser = async (id, status) => {
  const res = await api.put(`/users/${id}/ban`, { status });
  return res.data;
};

// ─── Payments (Razorpay) ──────────────────────────────────────────────────────
export const createRazorpayOrder = async (orderData) => {
  const res = await api.post('/create-order', orderData);
  return res.data.order;
};

export const verifyPayment = async (paymentData) => {
  const res = await api.post('/verify-payment', paymentData);
  return res.data;
};

// ─── PDF Upload ───────────────────────────────────────────────────────────────
export const uploadPdf = async (file) => {
  const formData = new FormData();
  formData.append('pdf', file);
  const res = await api.post('/upload-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const checkBackendHealth = async () => {
  const res = await api.get('/health');
  return res.data;
};

export default api;