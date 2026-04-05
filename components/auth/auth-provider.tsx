'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/types'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Failed to fetch user profile:', error)
        return null
      }
      return data as User
    } catch (err) {
      console.error('Error fetching user profile:', err)
      return null
    }
  }, [supabase])

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Dev mode: check localStorage for dev user
        const devUserStr = typeof window !== 'undefined' ? localStorage.getItem('dev_user') : null
        if (devUserStr) {
          try {
            const devUser = JSON.parse(devUserStr) as User
            setUser(devUser)
            setLoading(false)
            return
          } catch { /* ignore parse errors */ }
        }

        const { data: { session: currentSession } } = await supabase.auth.getSession()
        setSession(currentSession)

        if (currentSession?.user) {
          const profile = await fetchUserProfile(currentSession.user.id)
          setUser(profile)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for dev-login events
    const handleDevLogin = () => {
      const devUserStr = localStorage.getItem('dev_user')
      if (devUserStr) {
        try {
          setUser(JSON.parse(devUserStr) as User)
        } catch { /* ignore */ }
      }
    }
    window.addEventListener('dev-login', handleDevLogin)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession)

        if (newSession?.user) {
          const profile = await fetchUserProfile(newSession.user.id)
          setUser(profile)
        } else if (event === 'SIGNED_OUT') {
          // Only clear user on explicit sign out
          setUser(null)
          setSession(null)
        } else {
          // Don't clear dev user on initial auth state change with no session
          const hasDevUser = localStorage.getItem('dev_user')
          if (!hasDevUser) {
            setUser(null)
          }
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('dev-login', handleDevLogin)
    }
  }, [supabase, fetchUserProfile])

  const signOut = useCallback(async () => {
    localStorage.removeItem('dev_user')
    document.cookie = 'dev_user_active=; path=/; max-age=0'
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext }
