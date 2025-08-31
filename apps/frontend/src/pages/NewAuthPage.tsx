import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function NewAuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })
  const [localError, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showResendVerification, setShowResendVerification] = useState(false)
  const [resendingVerification, setResendingVerification] = useState(false)

  const { signUp, signIn, signInWithGoogle, resendVerification, loading, error, clearError, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as any)?.from?.pathname || '/wallet-setup'

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  useEffect(() => {
    return () => {
      clearError()
      setLocalError(null)
      setSuccess(null)
    }
  }, [isLogin, clearError])

  const validateForm = () => {
    setLocalError(null)
    
    if (!formData.email || !formData.password) {
      setLocalError('Email and password are required')
      return false
    }

    if (!isLogin) {
      if (!formData.fullName.trim()) {
        setLocalError('Full name is required')
        return false
      }
      
      if (formData.password.length < 6) {
        setLocalError('Password must be at least 6 characters long')
        return false
      }
      
      if (formData.password !== formData.confirmPassword) {
        setLocalError('Passwords do not match')
        return false
      }
    }

    return true
  }

  const getErrorMessage = (error: any) => {
    if (!error) return null
    
    // Handle both AuthError objects and string errors
    const errorCode = error?.code || ''
    const errorMessage = error?.message || error
    
    console.log('Error details:', { errorCode, errorMessage, fullError: error }) // Debug logging
    
    switch (errorCode) {
      case 'email_not_confirmed':
        return 'Please check your email and click the verification link before signing in.'
      case 'invalid_credentials':
        return 'Invalid email or password. Please check your credentials and try again.'
      case 'user_not_found':
        return 'No account found with this email address. Please sign up first.'
      case 'weak_password':
        return 'Password is too weak. Please use at least 6 characters.'
      case 'email_address_invalid':
        return 'Please enter a valid email address.'
      case 'signup_disabled':
        return 'Account registration is currently disabled.'
      case 'email_address_not_authorized':
        return 'This email address is not authorized to create an account.'
      case 'user_already_registered':
        return 'An account with this email already exists. Please sign in instead.'
      default:
        return errorMessage || 'An unexpected error occurred. Please try again.'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLocalError(null)
    setSuccess(null)

    try {
      if (isLogin) {
        const { error } = await signIn({
          email: formData.email,
          password: formData.password
        })
        
        if (error) {
          setLocalError(getErrorMessage(error))
          setShowResendVerification(error.code === 'email_not_confirmed')
        } else {
          setSuccess('Successfully signed in!')
          setShowResendVerification(false)
        }
      } else {
        const { error } = await signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName
            }
          }
        })
        
        if (error) {
          setLocalError(getErrorMessage(error))
        } else {
          setSuccess('Account created! Please check your email and click the verification link to complete your registration.')
          setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            fullName: ''
          })
        }
      }
    } catch (err) {
      setLocalError('An unexpected error occurred. Please try again.')
    }
  }

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle()
    if (error) {
      setLocalError(error.message)
    }
  }

  const handleResendVerification = async () => {
    setResendingVerification(true)
    setLocalError(null)
    
    const { error } = await resendVerification(formData.email)
    
    if (error) {
      setLocalError(getErrorMessage(error))
    } else {
      setSuccess('Verification email sent! Please check your inbox and spam folder.')
      setShowResendVerification(false)
    }
    
    setResendingVerification(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    
    // Clear errors when user starts typing
    if (localError) setLocalError(null)
    if (error) clearError()
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      fullName: ''
    })
    setLocalError(null)
    setSuccess(null)
    setShowResendVerification(false)
    clearError()
  }

  const currentError = localError || (error ? getErrorMessage(error) : null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="text-3xl font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
            RebalanceX
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            {isLogin ? 'Welcome back!' : 'Join RebalanceX'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin 
              ? 'Sign in to manage your portfolio' 
              : 'Create your account and start rebalancing'
            }
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-xl space-y-6">
          {/* Success Message */}
          {success && (
            <div className="flex items-center space-x-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* Error Message */}
          {currentError && (
            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{currentError}</span>
            </div>
          )}

          {/* Resend Verification */}
          {showResendVerification && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-blue-700 mb-3">
                    Haven't received the verification email? Check your spam folder or resend it.
                  </p>
                  <button
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendingVerification ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required={!isLogin}
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required={!isLogin}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="appearance-none relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!isLogin && formData.password !== formData.confirmPassword)}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                isLogin ? 'Sign in' : 'Create account'
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-indigo-600 hover:text-indigo-500 text-sm font-medium transition-colors"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {/* Forgot Password */}
          {isLogin && (
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-gray-600 hover:text-gray-500 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}