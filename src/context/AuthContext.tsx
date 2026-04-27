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

  // Guard against React StrictMode double-mount and stale closures
  const initDone = useRef(false)

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
    // ── Failsafe timeout ──────────────────────────────────────────────
    // If ANYTHING goes wrong (network, Supabase outage, stale token that
    // can't be refreshed, etc.), we clear loading so the user sees the
    // login page rather than an infinite spinner.
    const failsafeTimer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn('[AuthProvider] Failsafe timeout fired — forcing loading=false')
          return false
        }
        return prev
      })
    }, AUTH_INIT_TIMEOUT_MS)

    // ── onAuthStateChange ─────────────────────────────────────────────
    // This is the SINGLE source of truth. Key behaviors:
    //   • INITIAL_SESSION fires synchronously during the subscribe() call
    //     with the recovered session (it auto-refreshes expired JWTs).
    //   • SIGNED_IN / TOKEN_REFRESHED / USER_UPDATED fire later.
    //   • SIGNED_OUT fires on logout.
    //
    // We handle INITIAL_SESSION as our "app init" path. All subsequent
    // events are handled as live updates. This eliminates the old
    // getSession() race condition entirely.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null

        if (event === 'INITIAL_SESSION') {
          // Prevent StrictMode double-init
          if (initDone.current) return
          initDone.current = true

          setUser(currentUser)

          if (currentUser) {
            const fetchedRole = await fetchProfile(currentUser.id)

            if (fetchedRole) {
              setRole(fetchedRole)
            } else {
              // Profile fetch failed — could be RLS rejection with stale
              // token. Try getUser() to force a server-side refresh, then
              // retry the profile fetch one more time.
              console.warn('[AuthProvider] Profile fetch returned null, attempting token refresh via getUser()...')
              const { data: { user: refreshedUser } } = await supabase.auth.getUser()
              if (refreshedUser) {
                setUser(refreshedUser)
                const retryRole = await fetchProfile(refreshedUser.id)
                setRole(retryRole)
              } else {
                // Truly no valid session — treat as signed out
                console.warn('[AuthProvider] getUser() returned null — session is invalid')
                setUser(null)
                setRole(null)
              }
            }
          } else {
            setRole(null)
          }

          setLoading(false)
          clearTimeout(failsafeTimer)
          return
        }

        // ── Live auth events (post-init) ────────────────────────────
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (currentUser) {
            setUser(currentUser)
            const newRole = await fetchProfile(currentUser.id)
            setRole(newRole)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setRole(null)
        }
      }
    )

    return () => {
      clearTimeout(failsafeTimer)
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
