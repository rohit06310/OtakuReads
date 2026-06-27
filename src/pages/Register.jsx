import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { registerUserThunk, clearError } from '../store/authSlice'
import { BookOpen, Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth)

  useEffect(() => {
    if (isAuthenticated) navigate('/')
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()) }
  }, [error, dispatch])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      return toast.error('Please fill in all fields')
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match')
    }
    if (formData.password.length < 6) {
      return toast.error('Password must be at least 6 characters')
    }
    const result = await dispatch(registerUserThunk({ name: formData.name, email: formData.email, password: formData.password }))
    if (registerUserThunk.fulfilled.match(result)) {
      toast.success(`Welcome to OtakuReads, ${result.payload.name}! 🎉`)
    }
  }

  const Field = ({ id, label, name, type, icon: Icon, show, onToggle, placeholder }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
        <input
          id={id} name={name} type={type === 'password' ? (show ? 'text' : 'password') : type}
          required value={formData[name]} onChange={handleChange}
          className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          placeholder={placeholder}
        />
        {type === 'password' && (
          <button type="button" onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
            {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <span className="text-2xl font-black text-white">OtakuReads</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-gray-400">Join the otaku community today</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field id="reg-name" label="Full Name" name="name" type="text" icon={User} placeholder="Naruto Uzumaki" />
            <Field id="reg-email" label="Email address" name="email" type="email" icon={Mail} placeholder="you@otaku.com" />
            <Field id="reg-password" label="Password" name="password" type="password" icon={Lock}
              show={showPassword} onToggle={() => setShowPassword(!showPassword)} placeholder="••••••••" />
            <Field id="reg-confirm" label="Confirm Password" name="confirmPassword" type="password" icon={Lock}
              show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} placeholder="••••••••" />

            <button type="submit" disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account...</>
              ) : 'Create account'}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">Sign in</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Register