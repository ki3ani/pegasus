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
    console.log('🏗️ Creating profile with user data:', {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      metadata: user.user_metadata
    })
    
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      })

    if (error) {
      console.error('❌ Error creating profile:', error)
    } else {
      console.log('✅ Profile created successfully')
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
      console.log('🔥 AUTH EVENT:', event, 'User:', session?.user?.email)
      console.log('🔥 Session data:', session?.user?.user_metadata)
      
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        console.log('👤 Creating/fetching profile for:', session.user.email)
        console.log('👤 User metadata:', session.user.user_metadata)
        
        const profileData = await fetchProfile(session.user.id)
        if (profileData) {
          console.log('✅ Found existing profile:', profileData)
          setProfile(profileData)
        } else {
          console.log('⚠️ No profile found, creating new one with Google data')
          await createProfile(session.user)
          const newProfile = await fetchProfile(session.user.id)
          console.log('✅ Created new profile:', newProfile)
          setProfile(newProfile)
        }
      } else {
        console.log('❌ No user session, clearing profile')
        setProfile(null)
      }
      
      setLoading(false)

      if (event === 'SIGNED_IN') {
        console.log('🎉 SIGNED_IN event detected')
        clearError()
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('👋 SIGNED_OUT event detected')
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
    console.log('🚪 Starting sign out process...')
    clearError()
    
    try {
      console.log('🔄 Calling supabase signOut with timeout...')
      
      // Add 3 second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SignOut timeout')), 3000)
      )
      
      const signOutPromise = supabase.auth.signOut()
      
      const result = await Promise.race([signOutPromise, timeoutPromise])
      const { error } = result as { error: AuthError | null }

      if (error) {
        console.error('❌ Supabase signOut error:', error)
        setError(error)
      } else {
        console.log('✅ Supabase signOut successful')
      }
      
      // Always clear local state regardless of Supabase result
      console.log('🧹 Clearing local auth state...')
      setUser(null)
      setProfile(null)
      setSession(null)

      console.log('✅ Sign out completed successfully')
      return { error: null }
    } catch (err) {
      console.error('⏰ Sign out timeout or error:', err)
      
      // Still clear state even on timeout
      console.log('🧹 Force clearing auth state due to timeout...')
      setUser(null)
      setProfile(null)
      setSession(null)
      
      return { error: null } // Return success since we cleared state
    }
  }

  const signInWithGoogle = async () => {
    clearError()
    
    const redirectUrl = window.location.origin + '/auth'
    
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
    console.log('🔄 Starting profile update with:', updates)
    
    if (!user) {
      console.log('❌ No user logged in')
      const authError: AuthError = {
        message: 'No user logged in',
        status: 401,
        code: 'user_not_found'
      } as AuthError
      setError(authError)
      return { error: new Error('No user logged in') }
    }

    try {
      console.log('⏱️ Calling supabase update with 5 second timeout...')
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Update timeout')), 5000)
      )
      
      const updatePromise = supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      
      const result = await Promise.race([updatePromise, timeoutPromise])
      const { error } = result as { error: { message: string } | null }

      if (error) {
        console.error('❌ Profile update error:', error)
        const authError: AuthError = {
          message: error.message,
          status: 500,
          code: 'database_error'
        } as AuthError
        setError(authError)
        return { error: new Error(error.message) }
      }

      console.log('✅ Profile update successful')
      
      // Try to refresh profile (with timeout)
      console.log('🔄 Refreshing profile...')
      try {
        const refreshPromise = fetchProfile(user.id)
        const refreshTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Refresh timeout')), 3000)
        )
        
        const updatedProfile = await Promise.race([refreshPromise, refreshTimeout]) as Database['public']['Tables']['profiles']['Row'] | null
        if (updatedProfile) {
          console.log('✅ Profile refreshed successfully')
          setProfile(updatedProfile)
        }
      } catch {
        console.log('⏰ Profile refresh timeout, but update was successful')
      }

      return { error: null }
    } catch (err) {
      console.error('⏰ Profile update timeout or error:', err)
      return { error: new Error('Profile update failed or timed out') }
    }
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