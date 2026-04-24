import { deadlineAlerts } from './rules'
import type { Feature, OnTrackStatus, Phase } from './types'

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
    activePhase: phases[0]?.phaseName ?? 'N/A',
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
    const inProgress = phaseFeatures.filter((f) => f.status === 'In Progress' || f.status === 'Testing').length
    const completed = phaseFeatures.filter((f) => f.status === 'Completed').length
    const health = delayed > 0 ? 'Delayed' : inProgress > 0 ? 'On Track' : 'Completed'

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
