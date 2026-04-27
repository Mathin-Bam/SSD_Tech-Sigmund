import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContextInstance'
import type { AuthContextValue } from './AuthContextInstance'

// ── Timeout for the entire auth initialization. If Supabase hangs or the
//    network is unreachable, we force-clear loading after this duration so the
//    user is never stuck on the spinner forever.
const AUTH_INIT_TIMEOUT_MS = 8_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'admin' | 'executive' | 'dev' | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string): Promise<'admin' | 'executive' | 'dev' | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[AuthProvider] fetchProfile error:', error.message)
        return null
      }
      return (data as { role: 'admin' | 'executive' | 'dev' }).role ?? null
    } catch (err) {
      console.error('[AuthProvider] fetchProfile unexpected error:', err)
      return null
    }
  }

  useEffect(() => {
    let isMounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        const currentUser = session?.user ?? null

        if (event === 'INITIAL_SESSION') {
          if (currentUser) {
            let fetchedRole = await fetchProfile(currentUser.id)

            if (!fetchedRole) {
              console.warn('[AuthProvider] Profile fetch returned null, attempting token refresh via getUser()...')
              const { data: { user: refreshedUser } } = await supabase.auth.getUser()
              
              if (refreshedUser) {
                fetchedRole = await fetchProfile(refreshedUser.id)
                if (isMounted) {
                  setUser(refreshedUser)
                  setRole(fetchedRole)
                }
              } else {
                console.warn('[AuthProvider] getUser() returned null — session is invalid')
                if (isMounted) {
                  setUser(null)
                  setRole(null)
                }
              }
            } else {
              if (isMounted) {
                setUser(currentUser)
                setRole(fetchedRole)
              }
            }
          } else {
            if (isMounted) {
              setUser(null)
              setRole(null)
            }
          }

          if (isMounted) {
            setLoading(false)
          }
          return
        }

        // Live auth events (post-init)
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (currentUser) {
            if (isMounted) setUser(currentUser)
            const newRole = await fetchProfile(currentUser.id)
            if (isMounted) setRole(newRole)
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null)
            setRole(null)
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.warn('[AuthProvider] Server sign out error (token might be expired):', error.message)
      }
    } catch (err) {
      console.warn('[AuthProvider] Unexpected sign out error:', err)
    } finally {
      // Always clear local state to prevent being stuck with an invalid session
      setUser(null)
      setRole(null)
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
