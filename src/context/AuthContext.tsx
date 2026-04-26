import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContextInstance'
import type { AuthContextValue } from './AuthContextInstance'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'admin' | 'executive' | 'dev' | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error.message)
        setRole(null)
      } else if (data) {
        setRole((data as { role: 'admin' | 'executive' | 'dev' }).role)
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      setRole(null)
    }
  }

  useEffect(() => {
    let mounted = true

    async function getInitialSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error.message)
          if (mounted) setRole(null)
          return
        }

        const currentUser = session?.user ?? null
        if (mounted) {
          setUser(currentUser)
          if (currentUser) {
            await fetchProfile(currentUser.id)
          } else {
            setRole(null)
          }
        }
      } catch (err) {
        console.error('Unexpected error during initial session check:', err)
        if (mounted) setRole(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        // We already handled the initial fetch via getInitialSession()
        if (event === 'INITIAL_SESSION') return

        try {
          const currentUser = session?.user ?? null
          setUser(currentUser)

          if (
            currentUser &&
            (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
          ) {
            await fetchProfile(currentUser.id)
          } else if (event === 'SIGNED_OUT' || !currentUser) {
            setRole(null)
          }
        } catch (err) {
          console.error('Error handling auth state change:', err)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  const jobTitle: string | null = (user?.user_metadata as any)?.job_title ?? null

  const value: AuthContextValue = {
    user,
    role,
    jobTitle,
    loading,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
