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
    // Single source of truth for auth state.
    // onAuthStateChange fires INITIAL_SESSION on every page load/refresh with
    // the stored token — this replaces the old checkSession() pattern and
    // eliminates the race condition where setLoading(false) fired from the
    // listener before fetchProfile() had completed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const currentUser = session?.user ?? null
          setUser(currentUser)

          if (
            currentUser &&
            (event === 'INITIAL_SESSION' ||
              event === 'SIGNED_IN' ||
              event === 'TOKEN_REFRESHED')
          ) {
            // Fetch the role for any event that means "a user is authenticated".
            // INITIAL_SESSION covers page refresh with an existing session.
            // TOKEN_REFRESHED covers the silent JWT refresh that happens every ~hour.
            await fetchProfile(currentUser.id)
          } else if (event === 'SIGNED_OUT' || !currentUser) {
            setRole(null)
          }
        } catch (err) {
          console.error('Error handling auth state change:', err)
        } finally {
          // loading is cleared exactly once per auth event, AFTER all async
          // work (including fetchProfile) has completed.
          setLoading(false)
        }
      }
    )

    return () => {
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
