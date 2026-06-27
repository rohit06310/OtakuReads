import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchBooks as apiFetchBooks, createBook as apiCreateBook, updateBook as apiUpdateBook, deleteBook as apiDeleteBook } from '../lib/api';

// ─── Async Thunks ─────────────────────────────────────────────────────────────
export const fetchBooksThunk = createAsyncThunk(
  'books/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await apiFetchBooks(params);
      return data.books;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch books');
    }
  }
);

export const createBookThunk = createAsyncThunk(
  'books/create',
  async (bookData, { rejectWithValue }) => {
    try {
      const data = await apiCreateBook(bookData);
      return data.book;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to create book');
    }
  }
);

export const updateBookThunk = createAsyncThunk(
  'books/update',
  async ({ id, ...bookData }, { rejectWithValue }) => {
    try {
      const data = await apiUpdateBook(id, bookData);
      return data.book;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to update book');
    }
  }
);

export const deleteBookThunk = createAsyncThunk(
  'books/delete',
  async (id, { rejectWithValue }) => {
    try {
      await apiDeleteBook(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to delete book');
    }
  }
);

const applyFilters = (books, query, category) => {
  let filtered = [...books];
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q)
    );
  }
  if (category && category !== 'All') {
    filtered = filtered.filter((b) => b.category === category);
  }
  return filtered;
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const bookSlice = createSlice({
  name: 'books',
  initialState: {
    books: [],
    filteredBooks: [],
    selectedBook: null,
    loading: false,
    error: null,
    searchQuery: '',
    selectedCategory: 'All',
    categories: ['All', 'Shonen', 'Shojo', 'Seinen', 'Slice of Life', 'Isekai'],
  },
  reducers: {
    setSelectedBook: (state, action) => {
      state.selectedBook = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      state.filteredBooks = applyFilters(state.books, action.payload, state.selectedCategory);
    },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
      state.filteredBooks = applyFilters(state.books, state.searchQuery, action.payload);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all books
    builder
      .addCase(fetchBooksThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBooksThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.books = action.payload;
        state.filteredBooks = applyFilters(action.payload, state.searchQuery, state.selectedCategory);
      })
      .addCase(fetchBooksThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create book
    builder
      .addCase(createBookThunk.fulfilled, (state, action) => {
        state.books.unshift(action.payload);
        state.filteredBooks = applyFilters(state.books, state.searchQuery, state.selectedCategory);
      });

    // Update book
    builder
      .addCase(updateBookThunk.fulfilled, (state, action) => {
        const idx = state.books.findIndex((b) => b._id === action.payload._id);
        if (idx !== -1) state.books[idx] = action.payload;
        state.filteredBooks = applyFilters(state.books, state.searchQuery, state.selectedCategory);
      });

    // Delete book
    builder
      .addCase(deleteBookThunk.fulfilled, (state, action) => {
        state.books = state.books.filter((b) => b._id !== action.payload);
        state.filteredBooks = applyFilters(state.books, state.searchQuery, state.selectedCategory);
      });
  },
});

export const { setSelectedBook, setSearchQuery, setSelectedCategory, clearError } = bookSlice.actions;
export default bookSlice.reducer;