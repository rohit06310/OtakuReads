import { createSlice } from '@reduxjs/toolkit'

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    orders: JSON.parse(localStorage.getItem('orders')) || [],
    loading: false,
    error: null,
  },
  reducers: {
    createOrder: (state, action) => {
      const newOrder = {
        id: Date.now().toString(),
        ...action.payload,
        status: action.payload.paymentStatus === 'completed' ? 'completed' : 'pending',
        createdAt: new Date().toISOString(),
        paymentDetails: {
          paymentId: action.payload.paymentId,
          orderId: action.payload.orderId,
          signature: action.payload.signature,
          receipt: action.payload.receipt,
        }
      }
      state.orders.push(newOrder)
      localStorage.setItem('orders', JSON.stringify(state.orders))
    },
    setOrders: (state, action) => {
      state.orders = action.payload
    },
    updateOrderStatus: (state, action) => {
      const { orderId, status } = action.payload
      const order = state.orders.find(order => order.id === orderId)
      if (order) {
        order.status = status
        localStorage.setItem('orders', JSON.stringify(state.orders))
      }
    },
  },
})

export const { createOrder, setOrders, updateOrderStatus } = orderSlice.actions
export default orderSlice.reducer