import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FlagLog } from '../domain/types'

export function useFlagLogs(featureId?: string | null) {
  const [logs, setLogs] = useState<FlagLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    if (!featureId) {
      setLogs([])
      return
    }

    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('flag_logs')
        .select(`
          id,
          feature_id,
          flag_reason,
          resolution_note,
          resolved_by,
          resolved_at,
          profiles:resolved_by (
            full_name
          )
        `)
        .eq('feature_id', featureId)
        .order('resolved_at', { ascending: false })

      if (fetchError) throw fetchError

      const mapped: FlagLog[] = (data || []).map((row: any) => ({
        id: row.id,
        featureId: row.feature_id,
        flagReason: row.flag_reason,
        resolutionNote: row.resolution_note,
        resolvedBy: row.profiles?.full_name || 'Admin',
        resolvedAt: row.resolved_at,
      }))

      setLogs(mapped)
      setError(null)
    } catch (err: any) {
      console.error('Failed to fetch flag logs:', err)
      setError(err.message)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [featureId])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs
  }
}
