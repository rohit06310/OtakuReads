import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { validateCoupon as apiValidate, getCoupons as apiGetCoupons, createCoupon as apiCreateCoupon } from '../lib/api';

export const validateCouponThunk = createAsyncThunk(
  'coupons/validate',
  async ({ code, orderAmount }, { rejectWithValue }) => {
    try {
      const data = await apiValidate(code, orderAmount);
      return data.coupon;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Invalid coupon');
    }
  }
);

export const fetchCouponsThunk = createAsyncThunk(
  'coupons/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiGetCoupons();
      return data.coupons;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch coupons');
    }
  }
);

export const createCouponThunk = createAsyncThunk(
  'coupons/create',
  async (couponData, { rejectWithValue }) => {
    try {
      const data = await apiCreateCoupon(couponData);
      return data.coupon;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to create coupon');
    }
  }
);

const couponSlice = createSlice({
  name: 'coupons',
  initialState: {
    coupons: [],
    appliedCoupon: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearAppliedCoupon: (state) => { state.appliedCoupon = null; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(validateCouponThunk.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(validateCouponThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.appliedCoupon = action.payload;
      })
      .addCase(validateCouponThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.appliedCoupon = null;
      });

    builder
      .addCase(fetchCouponsThunk.fulfilled, (state, action) => {
        state.coupons = action.payload;
      });

    builder
      .addCase(createCouponThunk.fulfilled, (state, action) => {
        state.coupons.unshift(action.payload);
      });
  },
});

export const { clearAppliedCoupon, clearError } = couponSlice.actions;
export default couponSlice.reducer;
