import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export interface UpdateLog {
  id: string
  featureId: string
  changedBy: string    // mapped from profiles.full_name
  changeType: 'manual' | 'github_push'
  note: string | null
  createdAt: string
}

interface UseUpdateLogsReturn {
  logs: UpdateLog[]
  loading: boolean
  addLog: (featureId: string, note: string, changeType?: 'manual' | 'github_push') => Promise<void>
}

export function useUpdateLogs(featureId: string | null): UseUpdateLogsReturn {
  const [logs, setLogs] = useState<UpdateLog[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const fetchLogs = useCallback(async () => {
    if (!featureId) {
      setLogs([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('update_logs')
        .select(`
          *,
          profiles:changed_by (
            full_name
          )
        `)
        .eq('feature_id', featureId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const rows = (data as any[]) || []
      const mapped: UpdateLog[] = rows.map(row => ({
        id: row.id,
        featureId: row.feature_id,
        changedBy: (row.profiles as any)?.full_name || 'System',
        changeType: row.change_type,
        note: row.note,
        createdAt: row.created_at
      }))

      setLogs(mapped)
    } catch (err: any) {
      console.error('Error fetching logs:', err.message)
    } finally {
      setLoading(false)
    }
  }, [featureId])

  useEffect(() => {
    fetchLogs()

    if (!featureId) return

    const channel = supabase
      .channel(`logs_${featureId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'update_logs',
          filter: `feature_id=eq.${featureId}`
        },
        () => fetchLogs()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLogs, featureId])

  const addLog = async (fId: string, note: string, changeType: 'manual' | 'github_push' = 'manual') => {
    if (!user) return

    try {
      const { error } = await (supabase.from('update_logs') as any).insert({
        feature_id: fId,
        changed_by: user.id,
        change_type: changeType,
        note
      })

      if (error) throw error
      // Realtime will handle the state update
    } catch (err: any) {
      console.error('Failed to add log:', err.message)
    }
  }

  return { logs, loading, addLog }
}
