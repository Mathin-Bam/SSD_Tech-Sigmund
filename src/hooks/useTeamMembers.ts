import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TeamMember } from '../domain/types'
import { teamMembers as seedTeamMembers } from '../domain/seed'

interface UseTeamMembersReturn {
  teamMembers: TeamMember[]
  loading: boolean
  error: string | null
  inviteMember: (email: string, fullName: string, role: string) => Promise<void>
  deactivateMember: (userId: string) => Promise<void>
  refetch: () => Promise<void>
}

export function useTeamMembers(): UseTeamMembersReturn {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('team_members')
        .select('*')
        .eq('active', true)
        .order('full_name')

      if (fetchError) throw fetchError

      const rows = (data as any[]) || []
      if (rows.length === 0) {
        setTeamMembers(seedTeamMembers)
      } else {
        const mapped: TeamMember[] = rows.map(row => ({
          userId: row.user_id,
          name: row.full_name,
          role: row.role,
          department: row.department,
          availability: row.availability,
        }))
        setTeamMembers(mapped)
      }
      setError(null)
    } catch (err: any) {
      console.error('Error fetching team members:', err.message)
      setError(err.message)
      setTeamMembers(seedTeamMembers)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMembers()
    
    const channel = supabase
      .channel('team_members_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_members' },
        () => fetchMembers()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchMembers])

  const inviteMember = async (email: string, fullName: string, role: string) => {
    try {
      const { data, error: inviteError } = await supabase.functions.invoke('invite-member', {
        body: { email, fullName, role }
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
