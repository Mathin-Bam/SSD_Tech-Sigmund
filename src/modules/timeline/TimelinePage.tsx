import { useMemo, useState } from 'react'
import { daysUntilDeadline, deadlineAlerts } from '../../domain/rules'
import { getInitials, formatDate } from '../../shared/utils/formatters'
import type { Feature, Phase } from '../../domain/types'
import { Badge } from '../../shared/ui/components'
import { FeatureModal } from '../features/FeatureModal'
import { FeatureStatusSheet } from '../features/FeatureStatusSheet'

// ─── helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  'On Track':   '#22c55e',
  'Completed':  '#3b82f6',
  'Slight Risk':'#f59e0b',
  'At Risk':    '#f59e0b',
  'Delayed':    '#e31837',
}

const STAGE_COLOR: Record<string, string> = {
  Design:      '#a78bfa',
  Development: '#3b82f6',
  Testing:     '#f59e0b',
  Deployment:  '#22c55e',
  Done:        '#22d3ee',
}

const STAGE_ORDER = ['Design', 'Development', 'Testing', 'Deployment', 'Done']


// ─── sub-components ──────────────────────────────────────────────────────────

/** Donut chart (pure SVG) showing stage distribution */
function StageDonut({ features }: { features: Feature[] }) {
  const total = features.length
  if (total === 0) return null

  const counts = STAGE_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = features.filter((f) => f.stage === s).length
    return acc
  }, {})

  const size = 140
  const r = 52
  const circ = 2 * Math.PI * r
  let offset = 0

  const segments = STAGE_ORDER
    .filter((s) => counts[s] > 0)
    .map((s) => {
      const pct = counts[s] / total
      const dash = pct * circ
      const seg = { stage: s, pct, dash, offset }
      offset += dash
      return seg
    })

  const completedPct = Math.round(((counts['Done'] ?? 0) / total) * 100)

  return (
    <div className="tl-donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={18} />
        {segments.map((seg) => (
          <circle
            key={seg.stage}
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={STAGE_COLOR[seg.stage]}
            strokeWidth={18}
            strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
            strokeDashoffset={-seg.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="tl-donut-label">
        <span className="tl-donut-pct">{completedPct}%</span>
        <span className="tl-donut-sub">Done</span>
      </div>
      <div className="tl-donut-legend">
        {STAGE_ORDER.filter((s) => counts[s] > 0).map((s) => (
          <div key={s} className="tl-legend-row">
            <span className="tl-legend-dot" style={{ background: STAGE_COLOR[s] }} />
            <span className="tl-legend-label">{s}</span>
            <span className="tl-legend-count">{counts[s]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Inline horizontal progress rail with stage markers */
function MilestoneProgressRail({ feature }: { feature: Feature }) {
  const progress = feature.progress
  const isCurrentPulse = feature.status === 'In Progress' || feature.status === 'Testing'

  return (
    <div className="tl-rail-wrap" style={{ position: 'relative', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
      <div 
        className="tl-rail-bar" 
        style={{ 
          height: '12px', 
          background: 'rgba(255,255,255,0.05)', 
          backdropFilter: 'blur(8px)', 
          borderRadius: '99px',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          className="tl-rail-fill"
          style={{
            width: `${progress}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${STATUS_COLOR[feature.onTrackStatus] ?? '#3b82f6'}cc, ${STATUS_COLOR[feature.onTrackStatus] ?? '#3b82f6'})`,
            borderRadius: '99px',
            position: 'absolute',
            left: 0,
            top: 0,
            transition: 'width 0.4s ease'
          }}
        >
          {isCurrentPulse && progress > 0 && progress < 100 && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '20px',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5))',
              animation: 'pulse-glow 1.5s infinite alternate',
              borderRadius: '0 99px 99px 0'
            }} />
          )}
        </div>
      </div>
      <style>{`
        @keyframes pulse-glow {
          from { opacity: 0.2; box-shadow: 0 0 4px rgba(255,255,255,0.2); }
          to { opacity: 1; box-shadow: 0 0 10px rgba(255,255,255,0.6); }
        }
      `}</style>
    </div>
  )
}

/** Single milestone card */
function MilestoneCard({ feature, expanded, onToggle }: {
  feature: Feature
  expanded: boolean
  onToggle: () => void
}) {
  const dl = daysUntilDeadline(feature)
  const alerts = deadlineAlerts(feature)
  const statusColor = STATUS_COLOR[feature.onTrackStatus] ?? '#64748b'

  return (
    <div
      className="tl-milestone-card"
      style={{ borderLeftColor: statusColor }}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Milestone: ${feature.featureName}, ${feature.onTrackStatus}`}
    >
      {/* header row */}
      <div className="tl-mc-header">
        <div className="tl-mc-left">
          <div className="tl-mc-dot" style={{ background: statusColor }} />
          <div>
            <p className="tl-mc-name">{feature.featureName}</p>
            <p className="tl-mc-meta">
              <span
                className="tl-stage-chip"
                style={{ background: `${STAGE_COLOR[feature.stage]}20`, color: STAGE_COLOR[feature.stage], borderColor: `${STAGE_COLOR[feature.stage]}40` }}
              >
                {feature.stage}
              </span>
              &nbsp;·&nbsp;{feature.phaseName}&nbsp;·&nbsp;
              <span className="material-symbols-rounded" style={{ fontSize: 12, verticalAlign: 'middle', color: 'var(--text-muted)' }}>person</span>
              &nbsp;{feature.assignedTo}
            </p>
          </div>
        </div>
        <div className="tl-mc-right">
          <Badge
            label={feature.onTrackStatus}
            tone={
              feature.onTrackStatus === 'Completed' || feature.onTrackStatus === 'On Track'
                ? 'success'
                : feature.onTrackStatus === 'Delayed'
                ? 'danger'
                : 'warn'
            }
          />
        </div>
      </div>

      {/* progress rail always visible */}
      <div className="tl-mc-rail">
        <MilestoneProgressRail feature={feature} />
        <div className="tl-mc-progress-row">
          <span className="tl-progress-pct" style={{ color: statusColor }}>{feature.progress}%</span>
          <span className="tl-deadline-text">
            <span className="material-symbols-rounded" style={{ fontSize: 12, verticalAlign: 'middle' }}>calendar_today</span>
            &nbsp;{formatDate(feature.revisedDeadline ?? feature.plannedDeadline)}
            &nbsp;
            {dl >= 0
              ? <span style={{ color: dl <= 3 ? '#e31837' : dl <= 7 ? '#f59e0b' : 'var(--text-muted)' }}>({dl}d left)</span>
              : <span style={{ color: '#e31837' }}>({Math.abs(dl)}d overdue)</span>
            }
          </span>
        </div>
      </div>
    </div>
  )
}

/** Current Focus sprint hero card */
function CurrentFocusCard({ features }: { features: Feature[] }) {
  const inProgress = features.filter((f) => f.status === 'In Progress' || f.status === 'Testing')
  const mostUrgent = inProgress.sort((a, b) => daysUntilDeadline(a) - daysUntilDeadline(b))[0]
  if (!mostUrgent) return null

  const phase = mostUrgent.phaseName
  const dl = daysUntilDeadline(mostUrgent)

  return (
    <div className="tl-focus-card">
      <div className="tl-focus-top">
        <div>
          <p className="tl-focus-eyebrow">
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>bolt</span>
            Current Focus
          </p>
          <h2 className="tl-focus-title">{phase}: {mostUrgent.currentTask}</h2>
          <p className="tl-focus-desc">{mostUrgent.executiveSummary || mostUrgent.description}</p>
        </div>
        <div className="tl-focus-ring">
          <svg width={64} height={64} viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={32} cy={32} r={26} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} />
            <circle
              cx={32} cy={32} r={26} fill="none"
              stroke="#e31837" strokeWidth={7} strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - mostUrgent.progress / 100)}`}
            />
          </svg>
          <div className="tl-focus-ring-label">{mostUrgent.progress}%</div>
        </div>
      </div>

      <div className="tl-focus-tasks">
        {inProgress.slice(0, 3).map((f) => (
          <div className="tl-focus-task-row" key={f.featureId}>
            <div
              className="tl-focus-task-dot"
              style={{ background: STATUS_COLOR[f.onTrackStatus] }}
            />
            <span className="tl-focus-task-name">{f.featureName}</span>
            <span className="tl-focus-task-assignee">{f.assignedTo}</span>
            <div className="tl-focus-task-bar">
              <div style={{ width: `${f.progress}%`, height: '100%', background: STATUS_COLOR[f.onTrackStatus], borderRadius: 99 }} />
            </div>
            <span className="tl-focus-task-pct">{f.progress}%</span>
          </div>
        ))}
      </div>

      {dl >= 0 && (
        <div className="tl-focus-footer">
          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>schedule</span>
          Phase deadline:&nbsp;<strong>{formatDate(mostUrgent.revisedDeadline ?? mostUrgent.plannedDeadline)}</strong>
          &nbsp;·&nbsp;{dl} day{dl !== 1 ? 's' : ''} remaining
        </div>
      )}
    </div>
  )
}

/** Right sidebar: stage chart + active risks */
function TimelineSidebar({ features }: { features: Feature[] }) {
  const risks = features.filter(
    (f) => f.onTrackStatus === 'At Risk' || f.onTrackStatus === 'Delayed' || f.status === 'Blocked' || deadlineAlerts(f).some((a) => a.type === 'overdue')
  )

  const milestoneStats = [
    { label: 'Total',      value: features.length,                                  color: 'var(--text-muted)' },
    { label: 'On Track',   value: features.filter((f) => f.onTrackStatus === 'On Track').length, color: '#22c55e' },
    { label: 'At Risk',    value: features.filter((f) => f.onTrackStatus === 'At Risk' || f.onTrackStatus === 'Slight Risk').length, color: '#f59e0b' },
    { label: 'Delayed',    value: features.filter((f) => f.onTrackStatus === 'Delayed').length, color: '#e31837' },
    { label: 'Completed',  value: features.filter((f) => f.onTrackStatus === 'Completed').length, color: '#3b82f6' },
  ]

  return (
    <aside className="tl-sidebar">
      {/* Stage Distribution */}
      <div className="tl-sidebar-card">
        <p className="tl-sidebar-title">
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>donut_large</span>
          Stage Distribution
        </p>
        <StageDonut features={features} />
      </div>

      {/* Milestone Status */}
      <div className="tl-sidebar-card">
        <p className="tl-sidebar-title">
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>flag</span>
          Milestone Status
        </p>
        <div className="tl-status-list">
          {milestoneStats.map(({ label, value, color }) => (
            <div key={label} className="tl-status-row">
              <div className="tl-status-left">
                <span className="tl-status-dot" style={{ background: color }} />
                <span className="tl-status-label">{label}</span>
              </div>
              <span className="tl-status-count" style={{ color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Risks */}
      <div className="tl-sidebar-card">
        <p className="tl-sidebar-title">
          <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#f59e0b' }}>warning</span>
          Active Risks
          {risks.length > 0 && <span className="tl-risk-count">{risks.length}</span>}
        </p>
        {risks.length === 0 ? (
          <div className="tl-no-risks">
            <span className="material-symbols-rounded" style={{ fontSize: 32, color: '#22c55e' }}>check_circle</span>
            <p>No active risks</p>
          </div>
        ) : (
          <div className="tl-risk-list">
            {risks.map((f) => (
              <div key={f.featureId} className="tl-risk-item">
                <div className="tl-risk-header">
                  <span className="material-symbols-rounded" style={{ fontSize: 14, color: f.onTrackStatus === 'Delayed' ? '#e31837' : '#f59e0b' }}>
                    {f.onTrackStatus === 'Delayed' ? 'error' : 'warning'}
                  </span>
                  <p className="tl-risk-name">{f.featureName}</p>
                </div>
                <p className="tl-risk-note">{f.blockerNote || `${f.onTrackStatus} — deadline approaching`}</p>
                <div className="tl-risk-assignee">
                  <div className="tl-risk-avatar">{getInitials(f.assignedTo)}</div>
                  <span>{f.assignedTo}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterTab = 'All' | 'In Progress' | 'Completed' | 'Blocked' | 'At Risk'

const FILTER_TABS: FilterTab[] = ['All', 'In Progress', 'Completed', 'Blocked', 'At Risk']

export function TimelinePage({
  features,
  phases,
  role = 'executive',
  onUpdateFeature,
  onDeleteFeature
}: {
  features: Feature[]
  phases: Phase[]
  role?: 'admin' | 'executive'
  onUpdateFeature?: (id: string, patch: Partial<Feature>) => Promise<void>
  onDeleteFeature?: (id: string) => Promise<void>
}) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All')
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [phaseFilter, setPhaseFilter] = useState<string>('All')

  const phaseNames = useMemo(() => Array.from(new Set(features.map((f) => f.phaseName))), [features])

  const filtered = useMemo(() => {
    return features.filter((f) => {
      if (phaseFilter !== 'All' && f.phaseName !== phaseFilter) return false
      if (activeFilter === 'All') return true
      if (activeFilter === 'In Progress') return f.status === 'In Progress' || f.status === 'In Review' || f.status === 'Testing'
      if (activeFilter === 'Completed') return f.status === 'Completed'
      if (activeFilter === 'Blocked') return f.status === 'Blocked'
      if (activeFilter === 'At Risk') return f.onTrackStatus === 'At Risk' || f.onTrackStatus === 'Delayed' || f.onTrackStatus === 'Slight Risk'
      return true
    })
  }, [features, activeFilter, phaseFilter])

  // Group by explicit Phase registry
  const byPhase = useMemo(() => {
    const grouped = phases.reduce<Record<string, Feature[]>>((acc, p) => {
      acc[p.phaseId] = []
      return acc
    }, {})
    grouped['_unassigned'] = []

    const sortedFeatures = [...filtered].sort((a, b) => a.plannedDeadline.localeCompare(b.plannedDeadline))
    
    sortedFeatures.forEach(f => {
      // Find a matching phase in the registry (by ID or fallback to name)
      const matchedPhase = phases.find(p => p.phaseId === f.phaseId || p.phaseName === f.phaseName)
      if (matchedPhase && grouped[matchedPhase.phaseId]) {
        grouped[matchedPhase.phaseId].push(f)
      } else {
        grouped['_unassigned'].push(f)
      }
    })
    return grouped
  }, [filtered, phases])

  const handleFeatureClick = (feature: Feature) => {
    setSelectedFeature(feature)
    if (role === 'admin') {
      setIsModalOpen(true)
    } else {
      setIsSheetOpen(true)
    }
  }

  return (
    <div className="tl-root">
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-text">
          <h1>Project Timeline</h1>
          <p>Weekly roadmap and milestone tracking. Review status, upcoming deadlines, and stage progress.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative', zIndex: 1 }}>
          <span className="page-header-badge">
            <span className="material-symbols-rounded" style={{ fontSize: 14 }}>event_note</span>
            {features.length} milestones
          </span>
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            style={{ width: 'auto', minWidth: 120 }}
            aria-label="Filter by phase"
          >
            <option value="All">All Phases</option>
            {phaseNames.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* ── Macro Phase Header ── */}
      <div className="tl-macro-header" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-rounded" style={{ color: 'var(--brand-primary)' }}>rocket_launch</span>
          Macro Phase Progress
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {phases.slice(0, 4).map(phase => {
            const phaseFeatures = byPhase[phase.phaseId] || []
            const phasePct = phaseFeatures.length > 0 
              ? Math.round(phaseFeatures.reduce((acc, f) => acc + f.progress, 0) / phaseFeatures.length)
              : 0

            return (
              <div key={phase.phaseId} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{phase.phaseName}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-base)' }}>{phasePct}%</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${phasePct}%`, 
                      background: 'var(--brand-primary)',
                      transition: 'width 0.4s ease'
                    }} 
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="tl-body">
        {/* Left main column */}
        <div className="tl-main">
          {/* Current Focus */}
          <CurrentFocusCard features={features} />

          {/* Filter tabs */}
          <div className="tl-filter-tabs">
            {FILTER_TABS.map((tab) => {
              const count = tab === 'All' ? features.length
                : tab === 'In Progress' ? features.filter((f) => f.status === 'In Progress' || f.status === 'Testing').length
                : tab === 'Completed' ? features.filter((f) => f.status === 'Completed').length
                : tab === 'Blocked' ? features.filter((f) => f.status === 'Blocked').length
                : features.filter((f) => f.onTrackStatus === 'At Risk' || f.onTrackStatus === 'Delayed').length
              return (
                <button
                  key={tab}
                  type="button"
                  className={`tl-tab${activeFilter === tab ? ' tl-tab-active' : ''}`}
                  onClick={() => setActiveFilter(tab)}
                >
                  {tab}
                  <span className="tl-tab-count">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Phase groups */}
          {phases.length === 0 && features.length === 0 ? (
            <div className="tl-empty">
              <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--text-faint)' }}>search_off</span>
              <p>No milestones match the current filter.</p>
            </div>
          ) : (
            [...phases, { phaseId: '_unassigned', phaseName: 'Unassigned Features', status: 'On Track', startDate: '', targetDate: '', owner: '' }]
              .filter(phase => phase.phaseId === '_unassigned' ? byPhase['_unassigned']?.length > 0 : true)
              .map((phase) => {
              const items = byPhase[phase.phaseId] || []
              if (items.length === 0 && activeFilter !== 'All') return null

              const completedCount = items.filter((f) => f.status === 'Completed').length
              const phasePct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0

              return (
                <div key={phase.phaseId} className="tl-phase-group">
                  <div className="tl-phase-header">
                    <div className="tl-phase-header-left">
                      <span className="material-symbols-rounded" style={{ fontSize: 16, color: 'var(--accent-blue)' }}>account_tree</span>
                      <div>
                        <p className="tl-phase-name">{phase.phaseName}</p>
                        {phase.phaseId !== '_unassigned' && (
                          <p className="tl-phase-dates">
                            {formatDate(phase.startDate)}&nbsp;→&nbsp;{formatDate(phase.targetDate)}
                            &nbsp;·&nbsp;Owner: {phase.owner || 'Unassigned'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="tl-phase-header-right">
                      <span className="tl-phase-pct" style={{ color: phasePct === 100 ? '#22c55e' : 'var(--text)' }}>{phasePct}%</span>
                      <Badge
                        label={phase?.status ?? 'On Track'}
                        tone={
                          phase?.status === 'Delayed' ? 'danger'
                          : phase?.status === 'Completed' ? 'success'
                          : phase?.status === 'Needs Attention' ? 'warn'
                          : 'success'
                        }
                      />
                    </div>
                  </div>

                  {/* Phase progress bar */}
                  <div className="tl-phase-bar">
                    <div className="tl-phase-bar-fill" style={{ width: `${phasePct}%` }} />
                  </div>

                  {/* Milestone cards */}
                  <div className="tl-milestones">
                    {items.map((f) => (
                      <MilestoneCard
                        key={f.featureId}
                        feature={f}
                        expanded={false}
                        onToggle={() => handleFeatureClick(f)}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right sidebar */}
        <TimelineSidebar features={features} />
      </div>

      {/* Modals & Sheets */}
      <FeatureStatusSheet 
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        feature={selectedFeature}
      />

      {role === 'admin' && onUpdateFeature && onDeleteFeature && (
        <FeatureModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          feature={selectedFeature}
          onSave={async (patch) => {
            if (selectedFeature) {
              await onUpdateFeature(selectedFeature.featureId, patch)
              setIsModalOpen(false)
            }
          }}
          onDelete={async (id) => {
            await onDeleteFeature(id)
            setIsModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
