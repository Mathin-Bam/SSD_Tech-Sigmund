import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Feature } from '../domain/types'
import { onTrackClassifier } from '../domain/rules'

export type FeatureUpdateFields = Partial<Feature>

interface UseFeaturesReturn {
  features: Feature[]
  loading: boolean
  error: string | null
  createFeature: (newFeature: Partial<Feature>) => Promise<void>
  updateFeature: (featureId: string, patch: FeatureUpdateFields) => Promise<void>
  deleteFeature: (featureId: string) => Promise<void>
  bulkUpsertFeatures: (newFeatures: Feature[]) => Promise<void>
  refetch: () => Promise<void>
}

// Safe date parser — never throws, always returns a valid ISO string
function safeIso(val: unknown, fallback = new Date().toISOString()): string {
  if (!val) return fallback
  try {
    const d = new Date(val as string)
    return isNaN(d.getTime()) ? fallback : d.toISOString()
  } catch {
    return fallback
  }
}

// Valid enum guards
const VALID_STATUSES = new Set(['Not Started','Planned','In Progress','In Review','Testing','Completed','Blocked','Delayed'])
const VALID_STAGES   = new Set(['Design','Development','Testing','Deployment','Done'])
const VALID_PRIORITIES = new Set(['Low','Medium','High','Critical'])
const VALID_ON_TRACK = new Set(['On Track','Slight Risk','At Risk','Delayed','Completed'])

// Map snake_case DB columns back to camelCase domain types — completely null-safe
function mapFeatureFromDb(row: any): Feature {
  const now = new Date().toISOString()
  return {
    featureId:               String(row?.feature_id   ?? crypto.randomUUID()),
    featureName:             String(row?.feature_name ?? 'Unnamed Feature'),
    description:             String(row?.description  ?? ''),
    phaseId:                 String(row?.phase_id     ?? ''),
    phaseName:               String(row?.phase_name   ?? ''),
    moduleName:              String(row?.module_name  ?? ''),
    priority:                VALID_PRIORITIES.has(row?.priority) ? row.priority : 'Medium',
    assignedTo:              String(row?.assigned_to  ?? ''),
    owner:                   String(row?.owner        ?? ''),
    team:                    String(row?.team         ?? ''),
    stage:                   VALID_STAGES.has(row?.stage)   ? row.stage   : 'Design',
    status:                  VALID_STATUSES.has(row?.status) ? row.status  : 'Not Started',
    progress:                typeof row?.progress === 'number' ? row.progress : Number(row?.progress ?? 0),
    startDate:               safeIso(row?.start_date,               now),
    plannedDeadline:         safeIso(row?.planned_deadline,         now),
    revisedDeadline:         row?.revised_deadline ? safeIso(row.revised_deadline) : undefined,
    estimatedCompletionDate: safeIso(row?.estimated_completion_date, now),
    onTrackStatus:           VALID_ON_TRACK.has(row?.on_track_status) ? row.on_track_status : 'On Track',
    currentTask:             String(row?.current_task  ?? ''),
    nextTask:                String(row?.next_task     ?? ''),
    subtasks:                Array.isArray(row?.subtasks) ? row.subtasks : [],
    dependencies:            Array.isArray(row?.dependencies) ? row.dependencies : [],
    blockerNote:             String(row?.blocker_note  ?? ''),
    qaStatus:                String(row?.qa_status     ?? 'Not Started'),
    designStatus:            String(row?.design_status ?? 'Not Started'),
    developmentStatus:       String(row?.development_status ?? 'Not Started'),
    lastUpdatedBy:           String(row?.last_updated_by ?? ''),
    lastUpdatedAt:           safeIso(row?.last_updated_at, now),
    clientVisibility:        row?.client_visibility !== false, // default true
    executiveSummary:        row?.executive_summary ?? undefined,
    mvpUrl:                  row?.mvp_url ?? undefined,
    srsRequirementId:        row?.srs_requirement_id ?? undefined,
    githubPrUrl:             row?.github_pr_url ?? undefined,
    internalNotes:           row?.internal_notes ?? undefined,
  }
}

// Map camelCase patch back to snake_case for DB update
function mapPatchToDb(patch: FeatureUpdateFields): any {
  const dbPatch: any = {}
  if ('featureName' in patch) dbPatch.feature_name = patch.featureName
  if ('moduleName' in patch) dbPatch.module_name = patch.moduleName
  if ('priority' in patch) dbPatch.priority = patch.priority
  if ('plannedDeadline' in patch) dbPatch.planned_deadline = patch.plannedDeadline
  if ('status' in patch) dbPatch.status = patch.status
  if ('progress' in patch) dbPatch.progress = patch.progress
  if ('internalNotes' in patch) dbPatch.internal_notes = patch.internalNotes
  if ('githubPrUrl' in patch) dbPatch.github_pr_url = patch.githubPrUrl
  if ('mvpUrl' in patch) dbPatch.mvp_url = patch.mvpUrl
  if ('srsRequirementId' in patch) dbPatch.srs_requirement_id = patch.srsRequirementId
  if ('executiveSummary' in patch) dbPatch.executive_summary = patch.executiveSummary
  if ('clientVisibility' in patch) dbPatch.client_visibility = patch.clientVisibility
  if ('assignedTo' in patch) dbPatch.assigned_to = patch.assignedTo
  
  if ('subtasks' in patch && Array.isArray(patch.subtasks)) {
    dbPatch.subtasks = patch.subtasks
    // Auto-calculate current/next tasks from subtasks
    const pending = patch.subtasks.filter(t => !t.completed)
    dbPatch.current_task = pending.length > 0 ? pending[0].title : ''
    dbPatch.next_task = pending.length > 1 ? pending[1].title : ''
  } else {
    if ('currentTask' in patch) dbPatch.current_task = patch.currentTask
    if ('nextTask' in patch) dbPatch.next_task = patch.nextTask
  }
  
  return dbPatch
}

function stableChannelSuffix(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ch_${Math.random().toString(36).slice(2, 11)}`
}

export function useFeatures(): UseFeaturesReturn {
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelSuffixRef = useRef<string>(stableChannelSuffix())

  const fetchFeatures = useCallback(async () => {
    try {
      console.log('[useFeatures] Fetching features from Supabase...')
      const { data, error: fetchError } = await supabase
        .from('features')
        .select('*')
        .order('feature_id')

      if (fetchError) {
        console.error('[useFeatures] Supabase query error:', fetchError)
        throw fetchError
      }

      const rows: any[] = Array.isArray(data) ? data : []
      console.log(`[useFeatures] Raw rows received: ${rows.length}`)

      const mapped: Feature[] = []
      for (const row of rows) {
        try {
          const feature = mapFeatureFromDb(row)
          mapped.push({ ...feature, onTrackStatus: onTrackClassifier(feature) })
        } catch (rowErr: any) {
          // Skip corrupted rows — log the offending row for debugging
          console.error('[useFeatures] Skipping bad row (mapping failed):', rowErr.message, row)
        }
      }

      console.log(`[useFeatures] Successfully mapped ${mapped.length} features`)
      setFeatures(mapped)
      setError(null)
    } catch (err: any) {
      const msg = err?.message ?? String(err)
      console.error('[useFeatures] fetchFeatures failed:', msg)
      setError(msg)
      setFeatures([])
    } finally {
      // ALWAYS release the loading state — no matter what happened above
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const debouncedRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        void fetchFeatures()
      }, 280)
    }

    void fetchFeatures()

    const channel = supabase
      .channel(`features_realtime_${channelSuffixRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'features' },
        debouncedRefetch,
      )
      .subscribe()

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      void supabase.removeChannel(channel)
    }
  }, [fetchFeatures])

  const updateFeature = async (featureId: string, patch: FeatureUpdateFields) => {
    const originalFeatures = [...features]
    
    // 1. Optimistic Update
    setFeatures(prev => prev.map(f => {
      if (f.featureId !== featureId) return f
      
      let merged = { ...f, ...patch }
      
      // Auto-calculate current/next tasks for optimistic UI
      if (patch.subtasks) {
        const pending = patch.subtasks.filter(t => !t.completed)
        merged.currentTask = pending.length > 0 ? pending[0].title : ''
        merged.nextTask = pending.length > 1 ? pending[1].title : ''
      }
      
      return { ...merged, onTrackStatus: onTrackClassifier(merged) }
    }))

    try {
      // 2. DB Update — this is what we await
      const { error: updateError } = await (supabase
        .from('features') as any)
        .update(mapPatchToDb(patch))
        .eq('feature_id', featureId)

      if (updateError) throw updateError

      // 3. Audit log — fire-and-forget, never block the caller
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        ;(supabase.from('update_logs') as any).insert({
          feature_id: featureId,
          changed_by: user.id,
          change_type: 'manual',
          note: `Updated: ${Object.keys(patch).join(', ')}`
        }).then(({ error: logError }: { error: any }) => {
          if (logError) console.error(`Audit log failed for ${featureId}:`, logError.message)
        })
      })
    } catch (err: any) {
      console.error('Update failed:', err.message)
      setError(`Update failed: ${err.message}`)
      // 4. Revert optimistic update on failure
      setFeatures(originalFeatures)
      throw err // let the caller (modal) handle the error too
    }
  }

  const bulkUpsertFeatures = async (newFeatures: Feature[]) => {
    setLoading(true)
    setError(null)
    try {
      const rows = newFeatures.map(f => ({
        feature_id: f.featureId,
        feature_name: f.featureName,
        description: f.description,
        phase_id: f.phaseId,
        phase_name: f.phaseName,
        module_name: f.moduleName,
        priority: f.priority,
        assigned_to: f.assignedTo,
        owner: f.owner,
        team: f.team,
        stage: f.stage,
        status: f.status,
        progress: f.progress,
        start_date: f.startDate,
        planned_deadline: f.plannedDeadline,
        revised_deadline: f.revisedDeadline,
        estimated_completion_date: f.estimatedCompletionDate,
        on_track_status: f.onTrackStatus,
        current_task: f.currentTask,
        next_task: f.nextTask,
        subtasks: f.subtasks,
        dependencies: f.dependencies,
        blocker_note: f.blockerNote,
        qa_status: f.qaStatus,
        design_status: f.designStatus,
        development_status: f.developmentStatus,
        last_updated_by: f.lastUpdatedBy,
        last_updated_at: new Date().toISOString(),
        client_visibility: f.clientVisibility,
        executive_summary: f.executiveSummary,
        mvp_url: f.mvpUrl,
        srs_requirement_id: f.srsRequirementId,
        github_pr_url: f.githubPrUrl,
        internal_notes: f.internalNotes,
      }))

      const { error: upsertError } = await (supabase
        .from('features') as any)
        .upsert(rows, { onConflict: 'feature_id' })

      if (upsertError) throw upsertError
      await fetchFeatures()
    } catch (err: any) {
      console.error('Bulk upsert failed:', err.message)
      setError(`Bulk upsert failed: ${err.message}`)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createFeature = async (newFeature: Partial<Feature>) => {
    try {
      const featureId = crypto.randomUUID()
      const now = new Date().toISOString()
      const dbRow = {
        feature_id: featureId,
        feature_name: newFeature.featureName || 'New Task',
        module_name: newFeature.moduleName || '',
        priority: newFeature.priority || 'Medium',
        planned_deadline: newFeature.plannedDeadline || now,
        status: 'Not Started',
        stage: 'Design',
        progress: 0,
        subtasks: [],
        start_date: now,
        last_updated_at: now
      }

      const { error: insertError } = await (supabase.from('features') as any).insert(dbRow)
      if (insertError) throw insertError

      await fetchFeatures()
    } catch (err: any) {
      console.error('Create failed:', err.message)
      setError(`Create failed: ${err.message}`)
      throw err
    }
  }

  const deleteFeature = async (featureId: string) => {
    try {
      const { error: deleteError } = await supabase.from('features').delete().eq('feature_id', featureId)
      if (deleteError) throw deleteError

      setFeatures(prev => prev.filter(f => f.featureId !== featureId))
    } catch (err: any) {
      console.error('Delete failed:', err.message)
      setError(`Delete failed: ${err.message}`)
      throw err
    }
  }

  return {
    features,
    loading,
    error,
    createFeature,
    updateFeature,
    deleteFeature,
    bulkUpsertFeatures,
    refetch: fetchFeatures
  }
}
