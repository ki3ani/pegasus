import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function SimpleAuthPage() {
  const [localError, setLocalError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { signInWithGoogle, loading, error, clearError, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  useEffect(() => {
    return () => {
      clearError()
      setLocalError(null)
    }
  }, [clearError])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setLocalError(null)
    
    const { error } = await signInWithGoogle()
    if (error) {
      setLocalError(error.message || 'Failed to sign in with Google')
    }
    
    setIsLoading(false)
  }

  const currentError = localError || (error ? error.message : null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="text-3xl font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
            RebalanceX
          </Link>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Welcome to RebalanceX
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with Google to start managing your portfolio
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-xl space-y-6">
          {/* Error Message */}
          {currentError && (
            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{currentError}</span>
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading || isLoading}
            className="w-full flex justify-center items-center px-4 py-4 border-2 border-gray-300 rounded-lg text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading || isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </div>
            ) : (
              <>
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Features */}
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">What you'll get:</h3>
            <div className="space-y-2">
              {[
                'Secure wallet management',
                'Portfolio tracking',
                'Real-time balance updates',
                'Future: Automated rebalancing'
              ].map((feature, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-gray-600 hover:text-gray-500 transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}