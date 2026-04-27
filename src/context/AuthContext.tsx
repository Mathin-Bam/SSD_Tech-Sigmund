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

  // LAYER 1: Explicit init with getSession → fetchProfile → getUser fallback
  useEffect(() => {
    let isMounted = true
    let initComplete = false

    // LAYER 3: Failsafe — completely synchronous UI recovery
    const failsafe = setTimeout(() => {
      if (!initComplete && isMounted) {
        console.warn('[Auth] Failsafe timeout — clearing stale session')
        initComplete = true
        // Fire and forget, no await!
        supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        
        setUser(null)
        setRole(null)
        setLoading(false)
      }
    }, AUTH_INIT_TIMEOUT_MS)

    async function initializeAuth() {
      try {
        const { data: { session }, error: sessErr } = await supabase.auth.getSession()

        if (sessErr || !session?.user) {
          supabase.auth.signOut({ scope: 'local' }).catch(() => {})
          if (isMounted && !initComplete) {
            setUser(null)
            setRole(null)
          }
          return
        }

        const { data, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()

        if (!error && data) {
          if (isMounted && !initComplete) {
            setUser(session.user)
            setRole((data as any).role)
          }
          return
        }

        // Profile fetch failed (stale JWT hit RLS). Force server-side refresh.
        const { data: { user: refreshed }, error: userErr } = await supabase.auth.getUser()

        if (userErr || !refreshed) {
          supabase.auth.signOut({ scope: 'local' }).catch(() => {})
          if (isMounted && !initComplete) {
            setUser(null)
            setRole(null)
          }
          return
        }

        // Retry profile with refreshed token
        const { data: retryData, error: retryError } = await supabase.from('profiles').select('role').eq('id', refreshed.id).single()
        if (isMounted && !initComplete) {
          setUser(refreshed)
          setRole(!retryError && retryData ? (retryData as any).role : null)
        }
      } catch (err) {
        console.error('[Auth] initializeAuth error:', err)
        supabase.auth.signOut({ scope: 'local' }).catch(() => {})
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

    return () => {
      isMounted = false
      clearTimeout(failsafe)
    }
  }, [])

  // LAYER 2: Live auth listener — purely synchronous to prevent Supabase deadlock!
  useEffect(() => {
    let isMounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'INITIAL_SESSION') return // Handled by initializeAuth

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const u = session?.user ?? null
        if (u) {
          setUser(u)
          // Do NOT await fetchProfile here! It deadlocks Supabase.
          // The separate useEffect below will catch the user state change and fetch the role.
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setRole(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Watch for user changes to fetch role if needed (handles post-init live updates without deadlocking)
  useEffect(() => {
    let isMounted = true

    async function fetchRoleForUser(u: User) {
      try {
        const { data, error } = await supabase.from('profiles').select('role').eq('id', u.id).single()
        if (!error && data && isMounted) {
          setRole((data as any).role)
        }
      } catch (err) {
        console.error('[Auth] async profile fetch error:', err)
      }
    }

    if (user && role === null) {
      fetchRoleForUser(user)
    }

    return () => {
      isMounted = false
    }
  }, [user, role])

  const signOut = async () => {
    // Clear local UI state immediately
    setUser(null)
    setRole(null)
    // Fire and forget server signout to avoid hanging if client is deadlocked
    supabase.auth.signOut().catch(() => {})
  }

  const jobTitle: string | null = (user?.user_metadata as any)?.job_title ?? null

  const value: AuthContextValue = { user, role, jobTitle, loading, signOut }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
