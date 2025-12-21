import React from 'react'
import { useDispatch } from 'react-redux'
import { removeFromCart, updateQuantity } from '../store/cartSlice'
import { Trash2, Plus, Minus } from 'lucide-react'
import toast from 'react-hot-toast'

const CartItem = ({ item }) => {
  const dispatch = useDispatch()

  const handleRemove = () => {
    dispatch(removeFromCart(item.id))
    toast.success('Book removed from cart')
  }

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return
    dispatch(updateQuantity({ id: item.id, quantity: newQuantity }))
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 flex flex-col sm:flex-row gap-4">
      <img
        src={item.coverImage}
        alt={item.title}
        className="w-full sm:w-24 h-32 sm:h-32 object-cover rounded-lg"
      />
      
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {item.title}
        </h3>
        <p className="text-gray-600 text-sm mb-2">by {item.author}</p>
        <p className="text-blue-600 font-bold text-lg">${item.price}</p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center border rounded-lg">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            className="p-2 hover:bg-gray-100 transition-colors"
            disabled={item.quantity <= 1}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 font-medium">{item.quantity}</span>
          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            className="p-2 hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <button
          onClick={handleRemove}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default CartItem