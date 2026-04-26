import { deadlineAlerts } from './rules'
import type { Feature, OnTrackStatus, Phase } from './types'

/** Build phase rows from feature data only (no hardcoded phases). */
export function derivePhasesFromFeatures(features: Feature[]): Phase[] {
  const byPhase = new Map<string, Feature[]>()
  for (const f of features) {
    const id = (f.phaseId || '').trim() || '_ungrouped'
    if (!byPhase.has(id)) byPhase.set(id, [])
    byPhase.get(id)!.push(f)
  }

  const rollupStatus = (group: Feature[]): Phase['status'] => {
    if (group.length === 0) return 'On Track'
    if (group.every((g) => g.status === 'Completed')) return 'Completed'
    if (group.some((g) => g.onTrackStatus === 'Delayed' || g.status === 'Delayed')) return 'Delayed'
    if (group.some((g) => ['At Risk', 'Slight Risk'].includes(g.onTrackStatus))) return 'Needs Attention'
    return 'On Track'
  }

  return [...byPhase.entries()]
    .map(([phaseId, group]) => {
      const phaseName = group[0]?.phaseName?.trim() || phaseId
      const dateStrings = group.flatMap((g) => [g.startDate, g.plannedDeadline, g.estimatedCompletionDate].filter(Boolean))
      const sorted = [...dateStrings].sort()
      const startDate = sorted[0] ?? ''
      const endDate = sorted.length > 0 ? sorted[sorted.length - 1]! : startDate
      const owner = group[0]?.owner?.trim() || '—'
      return {
        phaseId,
        phaseName,
        startDate: startDate || new Date().toISOString().slice(0, 10),
        targetDate: endDate || startDate || new Date().toISOString().slice(0, 10),
        status: rollupStatus(group),
        owner,
      }
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

export interface SummaryMetrics {
  totalPhases: number
  activePhase: string
  totalFeatures: number
  completedFeatures: number
  inProgressFeatures: number
  atRiskFeatures: number
  delayedFeatures: number
  upcomingThisWeek: number
  overallCompletionPct: number
  featuresInTesting: number
  assignedMembers: number
}

export function computeSummaryMetrics(features: Feature[], phases: Phase[]): SummaryMetrics {
  const completed = features.filter((f) => f.status === 'Completed').length
  const inProgress = features.filter((f) => ['In Progress', 'In Review', 'Testing'].includes(f.status)).length
  const atRisk = features.filter((f) => ['At Risk', 'Slight Risk'].includes(f.onTrackStatus)).length
  const delayed = features.filter((f) => f.onTrackStatus === 'Delayed').length
  const upcoming = features.filter((f) => deadlineAlerts(f).some((a) => a.type === 'due_soon')).length
  const progressSum = features.reduce((sum, f) => sum + f.progress, 0)

  return {
    totalPhases: phases.length,
    activePhase: (function() {
      const today = new Date()
      const active = phases.find((phase) => {
        const start = new Date(phase.startDate)
        const end = new Date(phase.targetDate)
        return start <= today && today <= end
      }) ?? phases.find((phase) => phase.status !== 'Completed') ?? phases[0]
      return active?.phaseName ?? 'N/A'
    })(),
    totalFeatures: features.length,
    completedFeatures: completed,
    inProgressFeatures: inProgress,
    atRiskFeatures: atRisk,
    delayedFeatures: delayed,
    upcomingThisWeek: upcoming,
    overallCompletionPct: features.length === 0 ? 0 : Math.round(progressSum / features.length),
    featuresInTesting: features.filter((f) => f.stage === 'Testing').length,
    assignedMembers: new Set(features.map((f) => f.assignedTo)).size,
  }
}

export function phaseHealth(phases: Phase[], features: Feature[]) {
  return phases.map((phase) => {
    const phaseFeatures = features.filter((f) => f.phaseId === phase.phaseId)
    const delayed = phaseFeatures.filter((f) => f.onTrackStatus === 'Delayed').length
    const inProgress = phaseFeatures.filter((f) => ['In Progress', 'In Review', 'Testing'].includes(f.status)).length
    const completed = phaseFeatures.filter((f) => f.status === 'Completed').length
    const health =
      delayed > 0
        ? 'Delayed'
        : inProgress > 0
          ? 'On Track'
          : phaseFeatures.length > 0 && completed === phaseFeatures.length
            ? 'Completed'
            : 'On Track'

    return { phase, total: phaseFeatures.length, delayed, inProgress, completed, health }
  })
}

export function stageCounts(features: Feature[]): Record<string, number> {
  return features.reduce<Record<string, number>>((acc, feature) => {
    acc[feature.stage] = (acc[feature.stage] ?? 0) + 1
    return acc
  }, {})
}

export function onTrackCounts(features: Feature[]): Record<OnTrackStatus, number> {
  return features.reduce<Record<OnTrackStatus, number>>(
    (acc, feature) => {
      acc[feature.onTrackStatus] += 1
      return acc
    },
    { 'On Track': 0, 'Slight Risk': 0, 'At Risk': 0, Delayed: 0, Completed: 0 },
  )
}
