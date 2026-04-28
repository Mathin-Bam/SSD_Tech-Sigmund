export type FeatureStatus =
  | 'Not Started'
  | 'Planned'
  | 'In Progress'
  | 'In Review'
  | 'Testing'
  | 'Completed'
  | 'Blocked'
  | 'Delayed'

export type FeatureStage =
  | 'Design'
  | 'Development'
  | 'Testing'
  | 'Deployment'
  | 'Done'

export type OnTrackStatus = 'On Track' | 'Slight Risk' | 'At Risk' | 'Delayed' | 'Completed'

export interface Phase {
  phaseId: string
  phaseName: string
  startDate: string
  targetDate: string
  status: 'On Track' | 'Needs Attention' | 'Delayed' | 'Completed'
  owner: string
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export interface Feature {
  featureId: string
  featureName: string
  description: string
  phaseId: string
  phaseName: string
  moduleName: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  assignedTo: string
  owner: string
  team: string
  stage: FeatureStage
  status: FeatureStatus
  progress: number
  startDate: string
  plannedDeadline: string
  revisedDeadline?: string
  estimatedCompletionDate: string
  onTrackStatus: OnTrackStatus
  currentTask: string
  nextTask: string
  subtasks: Subtask[]
  dependencies: string[]
  blockerNote: string
  qaStatus: string
  designStatus: string
  developmentStatus: string
  lastUpdatedBy: string
  lastUpdatedAt: string
  /** When false, feature is hidden from Executive view. */
  clientVisibility: boolean
  /** High-level update shown to clients / executives. */
  executiveSummary?: string
  /** Link to demo or MVP build. */
  mvpUrl?: string
  /** Reference id in the SSD-Tech SRS document. */
  srsRequirementId?: string
  /** Internal pull request link (Admin only in UI). */
  githubPrUrl?: string
  /** Internal developer notes (Admin only in UI). */
  internalNotes?: string
  /** True when a client has flagged this feature for team review. */
  isFlagged: boolean
  /** The reason supplied by the client when flagging. */
  flagReason?: string
  /** Used for Kanban column sorting */
  sortOrder?: number
}

export interface TeamMember {
  userId: string
  name: string
  role: string
  department: string
  availability: 'Available' | 'Near Capacity' | 'Overloaded'
}

export interface DeadlineAlert {
  type: 'due_soon' | 'overdue' | 'stale' | 'blocked'
  label: string
}

export type BlockerSeverity = 'Critical' | 'High' | 'Medium' | 'Low'
export type BlockerStatus = 'Open' | 'Escalated' | 'Resolved'

export interface Blocker {
  id: string
  featureId?: string
  title: string
  description: string
  category: string
  severity: BlockerSeverity
  status: BlockerStatus
  createdBy: string
  createdAt: string
}

export interface BlockerLog {
  id: string
  blockerId: string
  userId: string
  action: string
  notes?: string
  createdAt: string
}

export interface FlagLog {
  id: string
  featureId: string
  flagReason: string
  resolutionNote: string
  resolvedBy: string
  resolvedAt: string
}
