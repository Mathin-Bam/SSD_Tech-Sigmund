import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Feature } from '../domain/types'
import { onTrackClassifier } from '../domain/rules'
import { features as seedFeatures } from '../domain/seed'
import type { FeatureUpdateFields } from '../modules/features/FeatureEditForm'

interface UseFeaturesReturn {
  features: Feature[]
  loading: boolean
  error: string | null
  updateFeature: (featureId: string, patch: FeatureUpdateFields) => Promise<void>
  bulkUpsertFeatures: (newFeatures: Feature[]) => Promise<void>
  refetch: () => Promise<void>
}

// Map snake_case DB columns back to camelCase domain types
function mapFeatureFromDb(row: any): Feature {
  return {
    featureId: row.feature_id,
    featureName: row.feature_name,
    description: row.description ?? '',
    phaseId: row.phase_id ?? '',
    phaseName: row.phase_name ?? '',
    moduleName: row.module_name ?? '',
    priority: row.priority ?? 'Medium',
    assignedTo: row.assigned_to ?? '',
    owner: row.owner ?? '',
    team: row.team ?? '',
    stage: row.stage ?? 'Design',
    status: row.status ?? 'Not Started',
    progress: row.progress ?? 0,
    startDate: row.start_date ?? '',
    plannedDeadline: row.planned_deadline ?? '',
    revisedDeadline: row.revised_deadline ?? undefined,
    estimatedCompletionDate: row.estimated_completion_date ?? '',
    onTrackStatus: row.on_track_status ?? 'On Track',
    currentTask: row.current_task ?? '',
    nextTask: row.next_task ?? '',
    dependencies: row.dependencies ?? [],
    blockerNote: row.blocker_note ?? '',
    qaStatus: row.qa_status ?? 'Not Started',
    designStatus: row.design_status ?? 'Not Started',
    developmentStatus: row.development_status ?? 'Not Started',
    lastUpdatedBy: row.last_updated_by ?? '',
    lastUpdatedAt: row.last_updated_at ?? new Date().toISOString(),
    clientVisibility: row.client_visibility ?? true,
    executiveSummary: row.executive_summary ?? undefined,
    mvpUrl: row.mvp_url ?? undefined,
    srsRequirementId: row.srs_requirement_id ?? undefined,
    githubPrUrl: row.github_pr_url ?? undefined,
    internalNotes: row.internal_notes ?? undefined,
  }
}

// Map camelCase patch back to snake_case for DB update
function mapPatchToDb(patch: FeatureUpdateFields): any {
  const dbPatch: any = {}
  if ('progress' in patch) dbPatch.progress = patch.progress
  if ('internalNotes' in patch) dbPatch.internal_notes = patch.internalNotes
  if ('githubPrUrl' in patch) dbPatch.github_pr_url = patch.githubPrUrl
  if ('mvpUrl' in patch) dbPatch.mvp_url = patch.mvpUrl
  if ('srsRequirementId' in patch) dbPatch.srs_requirement_id = patch.srsRequirementId
  if ('executiveSummary' in patch) dbPatch.executive_summary = patch.executiveSummary
  if ('clientVisibility' in patch) dbPatch.client_visibility = patch.clientVisibility
  return dbPatch
}

export function useFeatures(): UseFeaturesReturn {
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFeatures = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('features')
        .select('*')
        .order('feature_id')

      if (fetchError) throw fetchError

      const rows = (data as any[]) || []
      if (rows.length === 0) {
        // Fallback to seed data if DB is empty
        setFeatures(seedFeatures)
      } else {
        const mapped = rows.map(row => {
          const feature = mapFeatureFromDb(row)
          return { ...feature, onTrackStatus: onTrackClassifier(feature) }
        })
        setFeatures(mapped)
      }
      setError(null)
    } catch (err: any) {
      console.error('Error fetching features:', err.message)
      setError(err.message)
      setFeatures(seedFeatures) // Fallback on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeatures()

    // Realtime subscription
    const channel = supabase
      .channel('features_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'features' },
        () => fetchFeatures()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFeatures])

  const updateFeature = async (featureId: string, patch: FeatureUpdateFields) => {
    const originalFeatures = [...features]
    
    // 1. Optimistic Update
    setFeatures(prev => prev.map(f => {
      if (f.featureId !== featureId) return f
      const merged = { ...f, ...patch }
      return { ...merged, onTrackStatus: onTrackClassifier(merged) }
    }))

    try {
      // 2. DB Update
      const { error: updateError } = await (supabase
        .from('features') as any)
        .update(mapPatchToDb(patch))
        .eq('feature_id', featureId)

      if (updateError) throw updateError

      // 3. Log the change
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await (supabase.from('update_logs') as any).insert({
          feature_id: featureId,
          changed_by: user.id,
          change_type: 'manual',
          note: `Updated: ${Object.keys(patch).join(', ')}`
        })
      }
    } catch (err: any) {
      console.error('Update failed:', err.message)
      setError(`Update failed: ${err.message}`)
      // 4. Revert on failure
      setFeatures(originalFeatures)
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

  return {
    features,
    loading,
    error,
    updateFeature,
    bulkUpsertFeatures,
    refetch: fetchFeatures
  }
}
