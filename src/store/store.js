import { configureStore } from '@reduxjs/toolkit'
import authSlice from './authSlice'
import bookSlice from './bookSlice'
import cartSlice from './cartSlice'
import orderSlice from './orderSlice'
import wishlistSlice from './wishlistSlice'

const store = configureStore({
  reducer: {
    auth: authSlice,
    books: bookSlice,
    cart: cartSlice,
    orders: orderSlice,
    wishlist: wishlistSlice,
  },
})

export default store
