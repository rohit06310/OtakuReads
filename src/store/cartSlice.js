import { createSlice } from '@reduxjs/toolkit'

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: JSON.parse(localStorage.getItem('cart')) || [],
    total: 0,
  },
  reducers: {
    addToCart: (state, action) => {
      const payloadId = action.payload._id || action.payload.id;
      const existingItem = state.items.find(item => (item._id || item.id) === payloadId)
      if (!existingItem) {
        state.items.push({ ...action.payload, quantity: 1 })
        state.total += action.payload.price
        localStorage.setItem('cart', JSON.stringify(state.items))
      }
    },
    removeFromCart: (state, action) => {
      const payloadId = action.payload._id || action.payload;
      const index = state.items.findIndex(item => (item._id || item.id) === payloadId)
      if (index !== -1) {
        state.total -= state.items[index].price * state.items[index].quantity
        state.items.splice(index, 1)
        localStorage.setItem('cart', JSON.stringify(state.items))
      }
    },
    updateQuantity: (state, action) => {
      const { id, _id, quantity } = action.payload
      const targetId = _id || id;
      const item = state.items.find(item => (item._id || item.id) === targetId)
      if (item) {
        state.total = state.total - (item.price * item.quantity) + (item.price * quantity)
        item.quantity = quantity
        localStorage.setItem('cart', JSON.stringify(state.items))
      }
    },
    clearCart: (state) => {
      state.items = []
      state.total = 0
      localStorage.removeItem('cart')
    },
    calculateTotal: (state) => {
      state.total = state.items.reduce((total, item) => total + item.price * item.quantity, 0)
    },
  },
})

export const { addToCart, removeFromCart, updateQuantity, clearCart, calculateTotal } = cartSlice.actions
export default cartSlice.reducer