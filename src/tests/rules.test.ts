import { describe, expect, it } from 'vitest'
import { deadlineAlerts, onTrackClassifier, progressBandFromStage } from '../domain/rules'
import type { Feature } from '../domain/types'

const baseFeature: Feature = {
  featureId: 'F-1',
  featureName: 'Sample',
  description: 'Sample',
  phaseId: 'P1',
  phaseName: 'Phase 1',
  moduleName: 'Core',
  priority: 'High',
  assignedTo: 'Rahim',
  owner: 'Lead',
  team: 'Engineering',
  stage: 'Development',
  status: 'In Progress',
  progress: 40,
  startDate: '2026-04-01',
  plannedDeadline: '2026-04-25',
  estimatedCompletionDate: '2026-04-24',
  onTrackStatus: 'On Track',
  currentTask: 'Build API',
  nextTask: 'Hook UI',
  dependencies: [],
  blockerNote: '',
  qaStatus: 'Not Started',
  designStatus: 'Completed',
  developmentStatus: 'In Progress',
  lastUpdatedBy: 'Rahim',
  lastUpdatedAt: '2026-04-18',
  clientVisibility: true,
}

describe('rule engine', () => {
  it('returns progress band for stage', () => {
    expect(progressBandFromStage('Design', 'Planned')).toEqual([0, 25])
    expect(progressBandFromStage('Testing', 'Testing')).toEqual([70, 90])
  })

  it('classifies delayed when deadline passed', () => {
    const status = onTrackClassifier(baseFeature, new Date('2026-05-01'))
    expect(status).toBe('Delayed')
  })

  it('returns deadline and stale alerts', () => {
    const alerts = deadlineAlerts(baseFeature, new Date('2026-04-24'))
    expect(alerts.map((a) => a.type)).toContain('due_soon')
    expect(alerts.map((a) => a.type)).toContain('stale')
  })
})
