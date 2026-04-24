import { onTrackClassifier } from './rules'
import type { Feature, Phase, TeamMember } from './types'

export const phases: Phase[] = [
  { phaseId: 'P1', phaseName: 'Phase 1', startDate: '2026-04-01', endDate: '2026-04-30', status: 'On Track', owner: 'Project Manager' },
  { phaseId: 'P2', phaseName: 'Phase 2', startDate: '2026-05-01', endDate: '2026-05-31', status: 'Needs Attention', owner: 'Team Lead' },
]

const rawFeatures: Omit<Feature, 'onTrackStatus'>[] = [
  {
    featureId: 'F-101', featureName: 'User Login with OTP', description: 'OTP login with SMS integration', phaseId: 'P1', phaseName: 'Phase 1',
    moduleName: 'Authentication', priority: 'High', assignedTo: 'Rahim', owner: 'Nabila', team: 'Backend', stage: 'Development', status: 'In Progress',
    progress: 55, startDate: '2026-04-10', plannedDeadline: '2026-04-28', estimatedCompletionDate: '2026-04-26', currentTask: 'Backend OTP verification',
    nextTask: 'Frontend integration', dependencies: ['SMS gateway key'], blockerNote: 'Waiting for final gateway key', qaStatus: 'Not Started',
    designStatus: 'Completed', developmentStatus: 'In Progress', lastUpdatedBy: 'Rahim', lastUpdatedAt: '2026-04-20', clientVisibility: true,
    executiveSummary: 'OTP flow is on track for Phase 1; awaiting SMS provider credentials.',
    mvpUrl: 'https://example.com/demo/login-otp',
    srsRequirementId: 'SRS-AUTH-12',
    githubPrUrl: 'https://github.com/ssd-tech/app/pull/101',
    internalNotes: 'Coordinate with infra for rate limits on OTP endpoint.',
  },
  {
    featureId: 'F-102', featureName: 'Profile Edit Screen', description: 'User profile update and validation', phaseId: 'P1', phaseName: 'Phase 1',
    moduleName: 'User Profile', priority: 'Medium', assignedTo: 'Sadia', owner: 'Nabila', team: 'Frontend', stage: 'Testing', status: 'Testing',
    progress: 82, startDate: '2026-04-08', plannedDeadline: '2026-04-24', estimatedCompletionDate: '2026-04-24', currentTask: 'Regression test pass',
    nextTask: 'Release handoff', dependencies: [], blockerNote: '', qaStatus: 'In Progress', designStatus: 'Completed',
    developmentStatus: 'Completed', lastUpdatedBy: 'QA Team', lastUpdatedAt: '2026-04-19', clientVisibility: true,
    executiveSummary: 'Profile edit in final QA; targeting handoff this week.',
    srsRequirementId: 'SRS-PROFILE-03',
  },
  {
    featureId: 'F-201', featureName: 'Reporting Dashboard Export', description: 'Export reports to CSV and PDF', phaseId: 'P2', phaseName: 'Phase 2',
    moduleName: 'Analytics', priority: 'Critical', assignedTo: 'Karim', owner: 'Tanvir', team: 'Fullstack', stage: 'Development', status: 'Blocked',
    progress: 38, startDate: '2026-04-15', plannedDeadline: '2026-05-07', estimatedCompletionDate: '2026-05-12', currentTask: 'API pagination support',
    nextTask: 'PDF renderer integration', dependencies: ['Audit service endpoint'], blockerNote: 'Dependency unresolved with audit service',
    qaStatus: 'Not Started', designStatus: 'Completed', developmentStatus: 'Blocked', lastUpdatedBy: 'Karim', lastUpdatedAt: '2026-04-16', clientVisibility: false,
    executiveSummary: 'Export work paused pending audit dependency; SSD-Tech team is aligned on mitigation.',
    mvpUrl: 'https://example.com/demo/reports',
    srsRequirementId: 'SRS-ANALYTICS-09',
    githubPrUrl: 'https://github.com/ssd-tech/app/pull/88',
    internalNotes: 'Blocked on audit service contract; escalate to platform team.',
  },
]

export const features: Feature[] = rawFeatures.map((feature) => ({
  ...feature,
  revisedDeadline: undefined,
  onTrackStatus: onTrackClassifier(feature as Feature),
}))

export const teamMembers: TeamMember[] = [
  { userId: 'U1', name: 'Rahim', role: 'Backend Developer', department: 'Engineering', availability: 'Near Capacity' },
  { userId: 'U2', name: 'Sadia', role: 'Frontend Developer', department: 'Engineering', availability: 'Available' },
  { userId: 'U3', name: 'Karim', role: 'Fullstack Developer', department: 'Engineering', availability: 'Overloaded' },
]
