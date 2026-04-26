import { useCallback, useEffect, useRef, useState } from 'react'
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

interface UpdateLogRow {
  id: string
  feature_id: string
  change_type: 'manual' | 'github_push'
  note: string | null
  created_at: string
  profiles: { full_name: string } | null
}

function stableChannelSuffix(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ch_${Math.random().toString(36).slice(2, 11)}`
}

export function useUpdateLogs(featureId: string | null): UseUpdateLogsReturn {
  const [logs, setLogs] = useState<UpdateLog[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const channelSuffixRef = useRef<string>(stableChannelSuffix())

  const fetchLogs = useCallback(async () => {
    if (!featureId) {
      setLogs([])
      setLoading(false)
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

      const rows = (data as UpdateLogRow[]) || []
      const mapped: UpdateLog[] = rows.map(row => ({
        id: row.id,
        featureId: row.feature_id,
        changedBy: row.profiles?.full_name || 'System',
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
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const debouncedRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        void fetchLogs()
      }, 200)
    }

    void fetchLogs()

    if (!featureId) {
      return () => {
        if (debounceTimer) clearTimeout(debounceTimer)
      }
    }

    const channel = supabase
      .channel(`update_logs_${featureId}_${channelSuffixRef.current}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'update_logs',
          filter: `feature_id=eq.${featureId}`,
        },
        debouncedRefetch,
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void supabase.removeChannel(channel)
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
      throw err
    }
  }

  return { logs, loading, addLog }
}
