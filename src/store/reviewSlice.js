import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addReview as apiAddReview, getBookReviews as apiGetReviews, deleteReview as apiDeleteReview } from '../lib/api';

export const fetchBookReviewsThunk = createAsyncThunk(
  'reviews/fetchByBook',
  async (bookId, { rejectWithValue }) => {
    try {
      const data = await apiGetReviews(bookId);
      return data.reviews;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch reviews');
    }
  }
);

export const addReviewThunk = createAsyncThunk(
  'reviews/add',
  async (reviewData, { rejectWithValue }) => {
    try {
      const data = await apiAddReview(reviewData);
      return data.review;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to add review');
    }
  }
);

export const deleteReviewThunk = createAsyncThunk(
  'reviews/delete',
  async (id, { rejectWithValue }) => {
    try {
      await apiDeleteReview(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to delete review');
    }
  }
);

const reviewSlice = createSlice({
  name: 'reviews',
  initialState: {
    reviews: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
    clearReviews: (state) => { state.reviews = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookReviewsThunk.pending, (state) => { state.loading = true; })
      .addCase(fetchBookReviewsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload;
      })
      .addCase(fetchBookReviewsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(addReviewThunk.pending, (state) => { state.loading = true; })
      .addCase(addReviewThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews.unshift(action.payload);
      })
      .addCase(addReviewThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(deleteReviewThunk.fulfilled, (state, action) => {
        state.reviews = state.reviews.filter(r => r._id !== action.payload);
      });
  },
});

export const { clearError, clearReviews } = reviewSlice.actions;
export default reviewSlice.reducer;
