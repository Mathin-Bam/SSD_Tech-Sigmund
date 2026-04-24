import type { DeadlineAlert, Feature, FeatureStage, FeatureStatus, OnTrackStatus } from './types'

const DAY_MS = 1000 * 60 * 60 * 24

function startOfUtcDay(value: string | Date): number {
  const date = new Date(value)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function progressBandFromStage(stage: FeatureStage, status: FeatureStatus): [number, number] {
  if (status === 'Completed' || stage === 'Done') return [100, 100]
  if (stage === 'Design') return [0, 25]
  if (stage === 'Development') return [25, 70]
  if (stage === 'Testing') return [70, 90]
  if (stage === 'Deployment') return [90, 100]
  return [0, 100]
}

export function onTrackClassifier(feature: Feature, now = new Date()): OnTrackStatus {
  if (feature.status === 'Completed' || feature.progress >= 100) return 'Completed'
  if (feature.status === 'Delayed') return 'Delayed'
  if (feature.status === 'Blocked') return 'At Risk'

  const daysLeft = Math.floor(
    (startOfUtcDay(feature.revisedDeadline ?? feature.plannedDeadline) - startOfUtcDay(now)) / DAY_MS,
  )

  if (daysLeft < 0) return 'Delayed'
  if (daysLeft <= 3 && feature.progress < 70) return 'At Risk'
  if (daysLeft <= 7 && feature.progress < 50) return 'Slight Risk'
  return 'On Track'
}

export function deadlineAlerts(feature: Feature, now = new Date()): DeadlineAlert[] {
  const alerts: DeadlineAlert[] = []
  const daysToDeadline = Math.floor(
    (startOfUtcDay(feature.revisedDeadline ?? feature.plannedDeadline) - startOfUtcDay(now)) / DAY_MS,
  )
  const daysSinceUpdate = Math.floor(
    (startOfUtcDay(now) - startOfUtcDay(feature.lastUpdatedAt)) / DAY_MS,
  )

  if (feature.status === 'Blocked') alerts.push({ type: 'blocked', label: 'Blocked' })
  if (daysToDeadline < 0 && feature.status !== 'Completed') alerts.push({ type: 'overdue', label: 'Overdue' })
  if (daysToDeadline >= 0 && daysToDeadline <= 7 && feature.status !== 'Completed') {
    alerts.push({ type: 'due_soon', label: 'Due within 7 days' })
  }
  if (daysSinceUpdate >= 3 && feature.status !== 'Completed') alerts.push({ type: 'stale', label: 'No updates in 3+ days' })

  return alerts
}

export function daysUntilDeadline(feature: Feature): number {
  const deadline = startOfUtcDay(new Date(feature.revisedDeadline ?? feature.plannedDeadline))
  const today = startOfUtcDay(new Date())
  return Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low'

export function getSeverityLevel(f: Feature): SeverityLevel {
  if (f.onTrackStatus === 'Delayed' || f.status === 'Blocked') return 'critical'
  if (f.onTrackStatus === 'At Risk') return 'high'
  if (f.onTrackStatus === 'Slight Risk') return 'medium'
  return 'low'
}

