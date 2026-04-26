import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Phase } from '../domain/types'

export type PhaseUpdateFields = Partial<Phase>

interface UsePhasesReturn {
  phases: Phase[]
  loading: boolean
  error: string | null
  createPhase: (newPhase: Partial<Phase>) => Promise<void>
  updatePhase: (phaseId: string, patch: PhaseUpdateFields) => Promise<void>
  deletePhase: (phaseId: string) => Promise<void>
  refetch: () => Promise<void>
}

// Safe date parser
function safeIso(val: unknown, fallback = new Date().toISOString()): string {
  if (!val) return fallback
  try {
    const d = new Date(val as string)
    return isNaN(d.getTime()) ? fallback : d.toISOString()
  } catch {
    return fallback
  }
}

function mapPhaseFromDb(row: any): Phase {
  const now = new Date().toISOString()
  return {
    phaseId: String(row?.phase_id ?? crypto.randomUUID()),
    phaseName: String(row?.phase_name ?? 'Unnamed Phase'),
    startDate: safeIso(row?.start_date, now),
    targetDate: safeIso(row?.target_date, now),
    status: row?.status || 'On Track',
    owner: String(row?.owner ?? ''),
  }
}

function mapPatchToDb(patch: PhaseUpdateFields): any {
  const dbPatch: any = {}
  if ('phaseName' in patch) dbPatch.phase_name = patch.phaseName
  if ('startDate' in patch) dbPatch.start_date = patch.startDate
  if ('targetDate' in patch) dbPatch.target_date = patch.targetDate
  if ('status' in patch) dbPatch.status = patch.status
  if ('owner' in patch) dbPatch.owner = patch.owner
  return dbPatch
}

function stableChannelSuffix(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ch_${Math.random().toString(36).slice(2, 11)}`
}

export function usePhases(): UsePhasesReturn {
  const [phases, setPhases] = useState<Phase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelSuffixRef = useRef<string>(stableChannelSuffix())

  const fetchPhases = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('phases')
        .select('*')
        .order('start_date', { ascending: true })

      if (fetchError) throw fetchError

      const mapped = (Array.isArray(data) ? data : []).map(mapPhaseFromDb)
      setPhases(mapped)
      setError(null)
    } catch (err: any) {
      console.error('[usePhases] fetchPhases failed:', err.message)
      setError(err.message)
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
        void fetchPhases()
      }, 280)
    }

    void fetchPhases()

    const channel = supabase
      .channel(`phases_realtime_${channelSuffixRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'phases' },
        debouncedRefetch,
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void supabase.removeChannel(channel)
    }
  }, [fetchPhases])

  const createPhase = async (newPhase: Partial<Phase>) => {
    try {
      const dbRow = {
        phase_id: crypto.randomUUID(),
        phase_name: newPhase.phaseName || 'New Phase',
        start_date: newPhase.startDate || new Date().toISOString(),
        target_date: newPhase.targetDate || new Date().toISOString(),
        status: newPhase.status || 'On Track',
        owner: newPhase.owner || ''
      }
      const { error: insertError } = await (supabase.from('phases') as any).insert(dbRow)
      if (insertError) throw insertError
      await fetchPhases()
    } catch (err: any) {
      console.error('Create phase failed:', err.message)
      throw err
    }
  }

  const updatePhase = async (phaseId: string, patch: PhaseUpdateFields) => {
    const originalPhases = [...phases]
    setPhases(prev => prev.map(p => p.phaseId === phaseId ? { ...p, ...patch } : p))

    try {
      const { error: updateError } = await (supabase.from('phases') as any)
        .update(mapPatchToDb(patch))
        .eq('phase_id', phaseId)

      if (updateError) throw updateError
    } catch (err: any) {
      setPhases(originalPhases)
      console.error('Update phase failed:', err.message)
      throw err
    }
  }

  const deletePhase = async (phaseId: string) => {
    try {
      const { error: deleteError } = await supabase.from('phases').delete().eq('phase_id', phaseId)
      if (deleteError) throw deleteError
      setPhases(prev => prev.filter(p => p.phaseId !== phaseId))
    } catch (err: any) {
      console.error('Delete phase failed:', err.message)
      throw err
    }
  }

  return { phases, loading, error, createPhase, updatePhase, deletePhase, refetch: fetchPhases }
}
