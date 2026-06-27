import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import bookReducer from './bookSlice'
import cartReducer from './cartSlice'
import orderReducer from './orderSlice'
import wishlistReducer from './wishlistSlice'
import reviewReducer from './reviewSlice'
import couponReducer from './couponSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    books: bookReducer,
    cart: cartReducer,
    orders: orderReducer,
    wishlist: wishlistReducer,
    reviews: reviewReducer,
    coupons: couponReducer,
  },
})
