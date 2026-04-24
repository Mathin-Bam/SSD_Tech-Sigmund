import type { DeadlineAlert, Feature, FeatureStage, FeatureStatus, OnTrackStatus } from './types'

const DAY_MS = 1000 * 60 * 60 * 24

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

  const deadline = new Date(feature.revisedDeadline ?? feature.plannedDeadline)
  const daysLeft = Math.floor((deadline.getTime() - now.getTime()) / DAY_MS)

  if (daysLeft < 0) return 'Delayed'
  if (daysLeft <= 3 && feature.progress < 70) return 'At Risk'
  if (daysLeft <= 7 && feature.progress < 50) return 'Slight Risk'
  return 'On Track'
}

export function deadlineAlerts(feature: Feature, now = new Date()): DeadlineAlert[] {
  const alerts: DeadlineAlert[] = []
  const deadline = new Date(feature.revisedDeadline ?? feature.plannedDeadline)
  const daysToDeadline = Math.floor((deadline.getTime() - now.getTime()) / DAY_MS)
  const daysSinceUpdate = Math.floor((now.getTime() - new Date(feature.lastUpdatedAt).getTime()) / DAY_MS)

  if (feature.status === 'Blocked') alerts.push({ type: 'blocked', label: 'Blocked' })
  if (daysToDeadline < 0 && feature.status !== 'Completed') alerts.push({ type: 'overdue', label: 'Overdue' })
  if (daysToDeadline >= 0 && daysToDeadline <= 7 && feature.status !== 'Completed') {
    alerts.push({ type: 'due_soon', label: 'Due within 7 days' })
  }
  if (daysSinceUpdate > 3 && feature.status !== 'Completed') alerts.push({ type: 'stale', label: 'No updates in 3+ days' })

  return alerts
}
