import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createOrder as apiCreateOrder, getMyOrders, getAllOrders as apiGetAllOrders, updateOrderStatus as apiUpdateOrderStatus } from '../lib/api';

export const createOrderThunk = createAsyncThunk(
  'orders/create',
  async (orderData, { rejectWithValue }) => {
    try {
      const data = await apiCreateOrder(orderData);
      return data.order;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to create order');
    }
  }
);

export const fetchMyOrdersThunk = createAsyncThunk(
  'orders/fetchMine',
  async (_, { rejectWithValue }) => {
    try {
      const data = await getMyOrders();
      return data.orders;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch orders');
    }
  }
);

export const fetchAllOrdersThunk = createAsyncThunk(
  'orders/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiGetAllOrders();
      return data.orders;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch all orders');
    }
  }
);

export const updateOrderStatusThunk = createAsyncThunk(
  'orders/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const data = await apiUpdateOrderStatus(id, status);
      return data.order;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to update order status');
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    orders: [],
    allOrders: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrderThunk.pending, (state) => { state.loading = true; })
      .addCase(createOrderThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.orders.unshift(action.payload);
      })
      .addCase(createOrderThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchMyOrdersThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchMyOrdersThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchMyOrdersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchAllOrdersThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchAllOrdersThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.allOrders = action.payload;
      })
      .addCase(fetchAllOrdersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(updateOrderStatusThunk.fulfilled, (state, action) => {
        const idx = state.allOrders.findIndex(o => o._id === action.payload._id);
        if (idx !== -1) state.allOrders[idx] = action.payload;
      });
  },
});

export const { clearError } = orderSlice.actions;
export default orderSlice.reducer;