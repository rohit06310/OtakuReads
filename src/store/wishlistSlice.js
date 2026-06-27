import { createSlice } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';

const getWishlistFromLocalStorage = () => {
  try {
    const wishlist = localStorage.getItem('wishlist');
    return wishlist ? JSON.parse(wishlist) : [];
  } catch (error) {
    console.error('Failed to load wishlist from local storage:', error);
    return [];
  }
};

const saveWishlistToLocalStorage = (wishlist) => {
  try {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  } catch (error) {
    console.error('Failed to save wishlist to local storage:', error);
  }
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: getWishlistFromLocalStorage(),
  },
  reducers: {
    addToWishlist: (state, action) => {
      const book = action.payload;
      const bookId = book._id || book.id;
      const existingItem = state.items.find((item) => (item._id || item.id) === bookId);

      if (!existingItem) {
        state.items.push(book);
        toast.success(`${book.title} added to wishlist!`);
      } else {
        toast.error(`${book.title} is already in your wishlist.`);
      }
      saveWishlistToLocalStorage(state.items);
    },
    removeFromWishlist: (state, action) => {
      const bookId = action.payload._id || action.payload;
      state.items = state.items.filter((item) => (item._id || item.id) !== bookId);
      toast.success('Book removed from wishlist!');
      saveWishlistToLocalStorage(state.items);
    },
    clearWishlist: (state) => {
      state.items = [];
      toast.success('Wishlist cleared!');
      saveWishlistToLocalStorage(state.items);
    },
  },
});

export const { addToWishlist, removeFromWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
