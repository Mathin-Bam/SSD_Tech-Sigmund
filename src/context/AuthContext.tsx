import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContextInstance'
import type { AuthContextValue } from './AuthContextInstance'

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
        console.error('[Auth] fetchProfile error:', error.message)
        return null
      }
      return (data as { role: 'admin' | 'executive' | 'dev' }).role ?? null
    } catch (err) {
      console.error('[Auth] fetchProfile unexpected error:', err)
      return null
    }
  }

  useEffect(() => {
    let isMounted = true
    let initComplete = false

    // LAYER 3: Failsafe — guarantees loading clears even if network is dead
    const failsafe = setTimeout(async () => {
      if (!initComplete && isMounted) {
        console.warn('[Auth] Failsafe timeout — clearing stale session')
        initComplete = true
        try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
        if (isMounted) {
          setUser(null)
          setRole(null)
          setLoading(false)
        }
      }
    }, AUTH_INIT_TIMEOUT_MS)

    // LAYER 1: Explicit init with getSession → fetchProfile → getUser fallback
    async function initializeAuth() {
      try {
        // getSession reads localStorage and auto-refreshes expired tokens
        const { data: { session }, error: sessErr } = await supabase.auth.getSession()

        if (sessErr || !session?.user) {
          // No session or error — wipe stale localStorage to ensure clean login
          try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
          if (isMounted && !initComplete) {
            setUser(null)
            setRole(null)
          }
          return
        }

        // Session exists — try fetching the profile
        const fetchedRole = await fetchProfile(session.user.id)

        if (fetchedRole) {
          if (isMounted && !initComplete) {
            setUser(session.user)
            setRole(fetchedRole)
          }
          return
        }

        // Profile fetch failed (stale JWT hit RLS). Force server-side refresh.
        const { data: { user: refreshed }, error: userErr } = await supabase.auth.getUser()

        if (userErr || !refreshed) {
          // Truly invalid — wipe everything for a clean login
          try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
          if (isMounted && !initComplete) {
            setUser(null)
            setRole(null)
          }
          return
        }

        // Retry profile with refreshed token
        const retryRole = await fetchProfile(refreshed.id)
        if (isMounted && !initComplete) {
          setUser(refreshed)
          setRole(retryRole)
        }
      } catch (err) {
        console.error('[Auth] initializeAuth error:', err)
        try { await supabase.auth.signOut({ scope: 'local' }) } catch {}
        if (isMounted && !initComplete) {
          setUser(null)
          setRole(null)
        }
      } finally {
        if (isMounted && !initComplete) {
          initComplete = true
          setLoading(false)
          clearTimeout(failsafe)
        }
      }
    }

    initializeAuth()

    // LAYER 2: Live auth listener — handles events AFTER init
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        if (event === 'INITIAL_SESSION') return

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          const u = session?.user ?? null
          if (u) {
            setUser(u)
            const r = await fetchProfile(u.id)
            if (isMounted) setRole(r)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setRole(null)
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
    setUser(null)
    setRole(null)
    try { await supabase.auth.signOut() } catch {}
  }

  const jobTitle: string | null = (user?.user_metadata as any)?.job_title ?? null

  const value: AuthContextValue = { user, role, jobTitle, loading, signOut }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
