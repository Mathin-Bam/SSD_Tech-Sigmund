import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContextInstance'
import type { AuthContextValue } from './AuthContextInstance'

/**
 * ─── AUTH PROVIDER ──────────────────────────────────────────────────────
 *
 * This component is the SINGLE source of truth for authentication state.
 *
 * ARCHITECTURE (why it's written this way):
 * -----------------------------------------
 * The infinite-loading bug was caused by relying on `onAuthStateChange`'s
 * `INITIAL_SESSION` event for init. That event fires synchronously during
 * the subscribe() call, BUT the async handler suspends at the first await.
 * If anything goes wrong during that async work (stale JWT → RLS rejection
 * → getUser() hang/failure), `setLoading(false)` never fires.
 *
 * The fix separates concerns:
 *  1. A standalone `initializeAuth()` runs on mount and ALWAYS resolves
 *     loading — wrapped in try/catch/finally so no path can hang.
 *  2. `onAuthStateChange` ONLY handles live updates AFTER init is done.
 *     It ignores `INITIAL_SESSION` entirely.
 *  3. A failsafe timeout guarantees loading clears even if the network
 *     is completely down or Supabase is unreachable.
 */

const AUTH_INIT_TIMEOUT_MS = 6_000

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
    let initComplete = false

    // ── LAYER 3: Failsafe timeout ──────────────────────────────────
    // If EVERYTHING else fails (network down, Supabase outage, token
    // refresh hangs, etc.), force loading=false so the user sees the
    // login page instead of an infinite spinner.
    const failsafe = setTimeout(() => {
      if (!initComplete && isMounted) {
        console.warn('[AuthProvider] ⚠ Failsafe timeout — forcing loading=false')
        initComplete = true
        setUser(null)
        setRole(null)
        setLoading(false)
      }
    }, AUTH_INIT_TIMEOUT_MS)

    // ── LAYER 1: Explicit init (the primary path) ──────────────────
    // We call getUser() directly. Unlike getSession(), getUser() makes
    // a server-side request that validates the JWT AND auto-refreshes
    // expired tokens. This is the ONLY reliable way to determine if
    // the cached session is still valid.
    async function initializeAuth() {
      try {
        const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser()

        if (userError || !validatedUser) {
          // No valid session — clear everything
          if (isMounted && !initComplete) {
            setUser(null)
            setRole(null)
          }
          return
        }

        // User is valid — fetch their role
        const fetchedRole = await fetchProfile(validatedUser.id)

        if (isMounted && !initComplete) {
          setUser(validatedUser)
          setRole(fetchedRole)
        }
      } catch (err) {
        console.error('[AuthProvider] initializeAuth error:', err)
        if (isMounted && !initComplete) {
          setUser(null)
          setRole(null)
        }
      } finally {
        // THIS IS THE KEY: finally{} block guarantees setLoading(false)
        // runs no matter what. No code path can bypass this.
        if (isMounted && !initComplete) {
          initComplete = true
          setLoading(false)
          clearTimeout(failsafe)
        }
      }
    }

    initializeAuth()

    // ── LAYER 2: Live auth listener (post-init only) ───────────────
    // This handles sign-in, sign-out, and token refresh events that
    // happen AFTER the initial load. INITIAL_SESSION is ignored because
    // we handle initialization ourselves above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return

        // Skip the initial session event — we handle init via getUser() above
        if (event === 'INITIAL_SESSION') return

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          const currentUser = session?.user ?? null
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
      clearTimeout(failsafe)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    // Always clear local state FIRST, then try server-side sign out.
    // This ensures the user is never stuck with a stale session locally.
    setUser(null)
    setRole(null)

    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[AuthProvider] Sign out error (session may already be expired):', err)
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
