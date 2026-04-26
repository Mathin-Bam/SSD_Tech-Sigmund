import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TeamMember } from '../domain/types'

interface UseTeamMembersReturn {
  teamMembers: TeamMember[]
  loading: boolean
  error: string | null
  inviteMember: (
    email: string,
    fullName: string,
    portalRole: 'admin' | 'executive',
    jobTitle: string,
  ) => Promise<void>
  deactivateMember: (userId: string) => Promise<void>
  refetch: () => Promise<void>
}

function stableChannelSuffix(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ch_${Math.random().toString(36).slice(2, 11)}`
}

export function useTeamMembers(): UseTeamMembersReturn {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelSuffixRef = useRef<string>(stableChannelSuffix())

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('team_members')
        .select('*')
        .eq('active', true)
        .order('full_name')

      if (fetchError) throw fetchError

      const rows = (data as any[]) || []
      const mapped: TeamMember[] =
        rows.length === 0
          ? []
          : rows.map((row) => ({
              userId: row.user_id,
              name: row.full_name,
              role: row.role,
              department: row.department,
              availability: row.availability,
            }))
      setTeamMembers(mapped)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching team members:', err.message)
      setError(err.message)
      setTeamMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const debouncedRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        void fetchMembers()
      }, 280)
    }

    void fetchMembers()

    const channel = supabase
      .channel(`team_members_realtime_${channelSuffixRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        debouncedRefetch,
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void supabase.removeChannel(channel)
    }
  }, [fetchMembers])

  const inviteMember = async (
    email: string,
    fullName: string,
    portalRole: 'admin' | 'executive',
    jobTitle: string,
  ) => {
    try {
      const { data, error: inviteError } = await supabase.functions.invoke('invite-member', {
        body: { email, fullName, portalRole, jobTitle },
      })

      if (inviteError) {
        throw new Error(inviteError.message || 'Edge function invocation failed')
      }

      if (data && data.error) {
        throw new Error(data.error)
      }

      // Refresh local list to show the newly invited user
      await fetchMembers()
    } catch (err: any) {
      console.error('Invite failed:', err.message)
      throw err
    }
  }

  const deactivateMember = async (userId: string) => {
    try {
      const { error: updateError } = await (supabase
        .from('team_members') as any)
        .update({ active: false })
        .eq('user_id', userId)

      if (updateError) throw updateError
      await fetchMembers()
    } catch (err: any) {
      console.error('Deactivation failed:', err.message)
      throw err
    }
  }

  return {
    teamMembers,
    loading,
    error,
    inviteMember,
    deactivateMember,
    refetch: fetchMembers
  }
}
