import React, { createContext, useContext, useEffect, useState } from 'react'
import { AuthError } from '@supabase/supabase-js'
import type { User, Session, SignInWithPasswordCredentials } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Database } from '../lib/supabase'

export interface AuthContextType {
  user: User | null
  profile: Database['public']['Tables']['profiles']['Row'] | null
  session: Session | null
  loading: boolean
  signUp: (credentials: { email: string; password: string; options?: { data?: Record<string, unknown>; emailRedirectTo?: string } }) => Promise<{ error: AuthError | null }>
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  resendVerification: (email: string) => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<Database['public']['Tables']['profiles']['Update']>) => Promise<{ error: Error | null }>
  clearError: () => void
  error: AuthError | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Database['public']['Tables']['profiles']['Row'] | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  
  // Failsafe: Stop loading after 10 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('AuthProvider: Loading timeout reached, forcing loading to false')
      setLoading(false)
    }, 10000)
    
    return () => clearTimeout(timeout)
  }, [])

  const clearError = () => setError(null)

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  }

  const createProfile = async (user: User) => {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      })

    if (error) {
      console.error('Error creating profile:', error)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting session:', error)
        setError(error as AuthError)
      }
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        fetchProfile(session.user.id).then(profileData => {
          if (profileData) {
            setProfile(profileData)
          } else {
            // Create profile if it doesn't exist
            createProfile(session.user)
          }
        })
      }
      
      setLoading(false)
    }).catch(err => {
      console.error('AuthProvider: Error in session check:', err)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const profileData = await fetchProfile(session.user.id)
        if (profileData) {
          setProfile(profileData)
        } else {
          await createProfile(session.user)
          const newProfile = await fetchProfile(session.user.id)
          setProfile(newProfile)
        }
      } else {
        setProfile(null)
      }
      
      setLoading(false)

      if (event === 'SIGNED_IN') {
        clearError()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (credentials: { email: string; password: string; options?: { data?: Record<string, unknown>; emailRedirectTo?: string } }) => {
    clearError()
    setLoading(true)
    
    // Use proper redirect URL that works on all devices
    const redirectUrl = window.location.origin + '/auth'
    
    const { error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        ...credentials.options,
        emailRedirectTo: redirectUrl
      }
    })
    
    if (error) {
      setError(error)
    }
    
    setLoading(false)
    return { error }
  }

  const signIn = async (credentials: SignInWithPasswordCredentials) => {
    clearError()
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword(credentials)
    
    if (error) {
      setError(error)
    }
    
    setLoading(false)
    return { error }
  }

  const signOut = async () => {
    clearError()
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      setError(error)
    }
    
    return { error }
  }

  const signInWithGoogle = async () => {
    clearError()
    
    // Redirect to wallet-setup after Google sign-in
    const redirectUrl = window.location.origin + '/wallet-setup'
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    })
    
    if (error) {
      setError(error)
    }
    
    return { error }
  }

  const resetPassword = async (email: string) => {
    clearError()
    
    // Use proper redirect URL that works on all devices
    const redirectUrl = window.location.origin + '/reset-password'
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    })
    
    if (error) {
      setError(error)
    }
    
    return { error }
  }

  const resendVerification = async (email: string) => {
    clearError()
    
    // Use proper redirect URL that works on all devices  
    const redirectUrl = window.location.origin + '/auth'
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectUrl
      }
    })
    
    if (error) {
      setError(error)
    }
    
    return { error }
  }

  const updateProfile = async (updates: Partial<Database['public']['Tables']['profiles']['Update']>) => {
    if (!user) {
      const authError: AuthError = {
        message: 'No user logged in',
        status: 401,
        code: 'user_not_found'
      } as AuthError
      setError(authError)
      return { error: new Error('No user logged in') }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      // Convert database error to AuthError-like format for consistency
      const authError: AuthError = {
        message: error.message,
        status: 500,
        code: 'database_error'
      } as AuthError
      setError(authError)
      return { error: new Error(error.message) }
    }

    // Refresh profile
    const updatedProfile = await fetchProfile(user.id)
    if (updatedProfile) {
      setProfile(updatedProfile)
    }

    return { error: null }
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    resetPassword,
    resendVerification,
    updateProfile,
    clearError,
    error
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}