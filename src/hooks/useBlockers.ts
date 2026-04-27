import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Blocker, BlockerLog } from '../domain/types'

export interface UseBlockersReturn {
  blockers: Blocker[]
  loading: boolean
  error: string | null
  fetchBlockers: () => Promise<void>
  createBlocker: (blocker: Partial<Blocker>) => Promise<void>
  updateBlocker: (id: string, updates: Partial<Blocker>) => Promise<void>
  resolveBlocker: (id: string) => Promise<void>
  escalateBlocker: (id: string) => Promise<void>
  addBlockerLog: (blockerId: string, action: string, notes?: string) => Promise<void>
  fetchBlockerLogs: (blockerId: string) => Promise<BlockerLog[]>
  allLogs: BlockerLog[]
}

export function useBlockers(): UseBlockersReturn {
  const [blockers, setBlockers] = useState<Blocker[]>([])
  const [allLogs, setAllLogs] = useState<BlockerLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllBlockerLogs = useCallback(async () => {
    try {
      const { data, error: fetchError } = await (supabase
        .from('blocker_logs') as any)
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const mapped: BlockerLog[] = (data || []).map((row: any) => ({
        id: String(row.id),
        blockerId: String(row.blocker_id),
        userId: String(row.user_id),
        action: String(row.action),
        notes: row.notes ? String(row.notes) : undefined,
        createdAt: String(row.created_at)
      }))
      setAllLogs(mapped)
    } catch (err: any) {
      console.error('[useBlockers] fetchAllBlockerLogs failed:', err.message)
    }
  }, [])

  const fetchBlockers = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await (supabase
        .from('blockers') as any)
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      const mapped: Blocker[] = (data || []).map((row: any) => ({
        id: String(row.id),
        featureId: row.feature_id ? String(row.feature_id) : undefined,
        title: String(row.title),
        description: String(row.description || ''),
        category: String(row.category || ''),
        severity: row.severity as Blocker['severity'],
        status: row.status as Blocker['status'],
        createdBy: String(row.created_by),
        createdAt: String(row.created_at)
      }))

      setBlockers(mapped)
      setError(null)
    } catch (err: any) {
      console.error('[useBlockers] fetchBlockers failed:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchBlockers()
    void fetchAllBlockerLogs()

    const channel = supabase
      .channel('blockers_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blockers' },
        () => {
          void fetchBlockers()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocker_logs' },
        () => {
          void fetchAllBlockerLogs()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchBlockers, fetchAllBlockerLogs])

  const addBlockerLog = async (blockerId: string, action: string, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: logError } = await (supabase
        .from('blocker_logs') as any)
        .insert({
          blocker_id: blockerId,
          user_id: user.id,
          action,
          notes: notes || null
        })

      if (logError) throw logError
    } catch (err: any) {
      console.error('[useBlockers] addBlockerLog failed:', err.message)
      throw err
    }
  }

  const fetchBlockerLogs = async (blockerId: string): Promise<BlockerLog[]> => {
    try {
      const { data, error: fetchError } = await (supabase
        .from('blocker_logs') as any)
        .select('*')
        .eq('blocker_id', blockerId)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      return (data || []).map((row: any) => ({
        id: String(row.id),
        blockerId: String(row.blocker_id),
        userId: String(row.user_id),
        action: String(row.action),
        notes: row.notes ? String(row.notes) : undefined,
        createdAt: String(row.created_at)
      }))
    } catch (err: any) {
      console.error('[useBlockers] fetchBlockerLogs failed:', err.message)
      return []
    }
  }

  const createBlocker = async (blocker: Partial<Blocker>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error: insertError } = await (supabase
        .from('blockers') as any)
        .insert({
          feature_id: blocker.featureId || null,
          title: blocker.title,
          description: blocker.description || null,
          category: blocker.category || null,
          severity: blocker.severity || 'Medium',
          status: 'Open',
          created_by: user.id
        })
        .select()
        .single()

      if (insertError) throw insertError

      await addBlockerLog(data.id, 'Created', `Blocker logged with severity ${data.severity}`)
      await fetchBlockers()
    } catch (err: any) {
      console.error('[useBlockers] createBlocker failed:', err.message)
      setError(`Create failed: ${err.message}`)
      throw err
    }
  }

  const updateBlocker = async (id: string, updates: Partial<Blocker>) => {
    try {
      const dbPatch: any = {}
      if (updates.title !== undefined) dbPatch.title = updates.title
      if (updates.description !== undefined) dbPatch.description = updates.description
      if (updates.category !== undefined) dbPatch.category = updates.category
      if (updates.severity !== undefined) dbPatch.severity = updates.severity
      if (updates.status !== undefined) dbPatch.status = updates.status
      if (updates.featureId !== undefined) dbPatch.feature_id = updates.featureId || null

      const { error: updateError } = await (supabase
        .from('blockers') as any)
        .update(dbPatch)
        .eq('id', id)

      if (updateError) throw updateError

      await addBlockerLog(id, 'Updated', `Updated blocker details`)
      await fetchBlockers()
    } catch (err: any) {
      console.error('[useBlockers] updateBlocker failed:', err.message)
      setError(`Update failed: ${err.message}`)
      throw err
    }
  }

  const resolveBlocker = async (id: string) => {
    try {
      const { error: updateError } = await (supabase
        .from('blockers') as any)
        .update({ status: 'Resolved' })
        .eq('id', id)

      if (updateError) throw updateError

      await addBlockerLog(id, 'Resolved', 'Blocker marked as resolved')
      await fetchBlockers()
    } catch (err: any) {
      console.error('[useBlockers] resolveBlocker failed:', err.message)
      setError(`Resolve failed: ${err.message}`)
      throw err
    }
  }

  const escalateBlocker = async (id: string) => {
    try {
      const { error: updateError } = await (supabase
        .from('blockers') as any)
        .update({ status: 'Escalated' })
        .eq('id', id)

      if (updateError) throw updateError

      await addBlockerLog(id, 'Requested Review', 'Escalated to Steering Committee')
      await fetchBlockers()
    } catch (err: any) {
      console.error('[useBlockers] escalateBlocker failed:', err.message)
      setError(`Escalate failed: ${err.message}`)
      throw err
    }
  }

  return {
    blockers,
    loading,
    error,
    fetchBlockers,
    createBlocker,
    updateBlocker,
    resolveBlocker,
    escalateBlocker,
    addBlockerLog,
    fetchBlockerLogs,
    allLogs
  }
}
