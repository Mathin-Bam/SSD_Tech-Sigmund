import { useMemo, useState } from 'react'
import { deadlineAlerts } from '../../domain/rules'
import type { Feature } from '../../domain/types'
import { Badge } from '../../shared/ui/components'

// ─── helpers ─────────────────────────────────────────────────────────────────

const DAY_MS = 1000 * 60 * 60 * 24

function daysLeft(feature: Feature): number {
  const deadline = new Date(feature.revisedDeadline ?? feature.plannedDeadline)
  return Math.floor((deadline.getTime() - Date.now()) / DAY_MS)
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

type SeverityLevel = 'critical' | 'high' | 'medium' | 'low'

function getSeverity(f: Feature): SeverityLevel {
  if (f.onTrackStatus === 'Delayed' || f.status === 'Blocked') return 'critical'
  if (f.onTrackStatus === 'At Risk') return 'high'
  if (f.onTrackStatus === 'Slight Risk') return 'medium'
  return 'low'
}

const SEVERITY_META: Record<SeverityLevel, { label: string; color: string; borderColor: string; bgColor: string }> = {
  critical: { label: 'Critical', color: '#e31837', borderColor: '#e31837',  bgColor: 'rgba(227,24,55,0.08)' },
  high:     { label: 'High',     color: '#f59e0b', borderColor: '#f59e0b',  bgColor: 'rgba(245,158,11,0.08)' },
  medium:   { label: 'Medium',   color: '#f59e0b', borderColor: '#f59e0b',  bgColor: 'rgba(245,158,11,0.06)' },
  low:      { label: 'Low',      color: '#64748b', borderColor: '#334155',  bgColor: 'rgba(255,255,255,0.03)' },
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#e31837,#f97316)',
  'linear-gradient(135deg,#3b82f6,#a78bfa)',
  'linear-gradient(135deg,#22c55e,#06b6d4)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
]

function avatarGradient(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx]
}

// ─── KPI Stat Card ────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: string
  label: string
  value: number | string
  color: string
  glowColor: string
  sub?: string
}

function StatCard({ icon, label, value, color, glowColor, sub }: StatCardProps) {
  return (
    <div className="rk-stat-card" style={{ '--rk-accent': color, '--rk-glow': glowColor } as React.CSSProperties}>
      <div className="rk-stat-body">
        <div>
          <p className="rk-stat-label">{label}</p>
          <p className="rk-stat-value" style={{ color }}>{value}</p>
          {sub && <p className="rk-stat-sub">{sub}</p>}
        </div>
        <div className="rk-stat-icon-wrap" style={{ background: `${color}18`, boxShadow: `0 0 20px ${color}30` }}>
          <span className="material-symbols-rounded" style={{ fontSize: 24, color }}>{icon}</span>
        </div>
      </div>
      <div className="rk-stat-bar" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
    </div>
  )
}

// ─── Waiting On / Action Required section ────────────────────────────────────

function WaitingOnBox({ text, assignee }: { text: string; assignee?: string }) {
  return (
    <div className="rk-info-box rk-waiting-box">
      <div className="rk-info-box-header">
        <span className="material-symbols-rounded" style={{ fontSize: 14, color: '#e31837' }}>hourglass_empty</span>
        <span className="rk-info-box-label" style={{ color: '#e31837' }}>Waiting On</span>
      </div>
      <p className="rk-info-box-text">{text}</p>
      {assignee && (
        <div className="rk-info-box-assignee">
          <div className="rk-mini-avatar" style={{ background: avatarGradient(assignee) }}>{getInitials(assignee)}</div>
          <span>{assignee}</span>
        </div>
      )}
    </div>
  )
}

function ActionRequiredBox({ text }: { text: string }) {
  return (
    <div className="rk-info-box rk-action-box">
      <div className="rk-info-box-header">
        <span className="material-symbols-rounded" style={{ fontSize: 14, color: '#f59e0b' }}>bolt</span>
        <span className="rk-info-box-label" style={{ color: '#f59e0b' }}>Action Required</span>
      </div>
      <p className="rk-info-box-text">{text}</p>
    </div>
  )
}

// ─── Risk Card ────────────────────────────────────────────────────────────────

function RiskCard({ feature }: { feature: Feature }) {
  const severity = getSeverity(feature)
  const meta = SEVERITY_META[severity]
  const alerts = deadlineAlerts(feature)
  const dl = daysLeft(feature)

  const hasBlocker = !!feature.blockerNote
  const hasWaitingOn = feature.dependencies.length > 0 || hasBlocker
  const isOverdue = dl < 0

  return (
    <article className="rk-card" style={{ borderLeftColor: meta.borderColor }}>
      {/* card header */}
      <div className="rk-card-header">
        <div className="rk-card-title-row">
          <span
            className="material-symbols-rounded"
            style={{ fontSize: 18, color: meta.color, flexShrink: 0 }}
          >
            {severity === 'critical' ? 'error' : 'warning'}
          </span>
          <div>
            <p className="rk-card-name">{feature.featureName}</p>
            <p className="rk-card-module">{feature.moduleName} · {feature.phaseName}</p>
          </div>
        </div>
        <div className="rk-card-badges">
          <span
            className="rk-severity-badge"
            style={{ background: `${meta.color}22`, color: meta.color, borderColor: `${meta.color}40` }}
          >
            {meta.label}
          </span>
          <Badge
            label={feature.onTrackStatus}
            tone={severity === 'critical' ? 'danger' : severity === 'high' || severity === 'medium' ? 'warn' : 'info'}
          />
        </div>
      </div>

      {/* description */}
      {feature.executiveSummary && (
        <p className="rk-card-desc">{feature.executiveSummary}</p>
      )}

      {/* Waiting On / Action Required boxes */}
      {hasWaitingOn && (
        <WaitingOnBox
          text={
            feature.blockerNote
              ? feature.blockerNote
              : feature.dependencies.join(', ')
          }
          assignee={feature.dependencies.length > 0 ? feature.assignedTo : undefined}
        />
      )}
      {(feature.status === 'Blocked' || isOverdue) && (
        <ActionRequiredBox
          text={
            feature.status === 'Blocked'
              ? `Unblock this feature immediately. Assigned to ${feature.owner} — coordinate with ${feature.team} team.`
              : `Deadline has passed. Immediate escalation required. Contact ${feature.owner}.`
          }
        />
      )}

      {/* alert chips */}
      {alerts.length > 0 && (
        <div className="rk-alert-chips">
          {alerts.map((a) => (
            <span
              key={a.type}
              className="rk-alert-chip"
              style={
                a.type === 'overdue' || a.type === 'blocked'
                  ? { background: 'rgba(227,24,55,0.12)', color: '#e31837', borderColor: 'rgba(227,24,55,0.3)' }
                  : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }
              }
            >
              <span className="material-symbols-rounded" style={{ fontSize: 11 }}>
                {a.type === 'overdue' ? 'error' : a.type === 'blocked' ? 'block' : a.type === 'stale' ? 'schedule' : 'alarm'}
              </span>
              {a.label}
            </span>
          ))}
        </div>
      )}

      {/* card footer */}
      <div className="rk-card-footer">
        <div className="rk-card-owner">
          <div className="rk-owner-avatar" style={{ background: avatarGradient(feature.assignedTo) }}>
            {getInitials(feature.assignedTo)}
          </div>
          <div>
            <p className="rk-owner-name">{feature.assignedTo}</p>
            <p className="rk-owner-team">{feature.team} · {feature.stage}</p>
          </div>
        </div>
        <div className="rk-card-deadline">
          <span className="material-symbols-rounded" style={{ fontSize: 13, color: isOverdue ? '#e31837' : 'var(--text-muted)' }}>
            {isOverdue ? 'event_busy' : 'calendar_today'}
          </span>
          <span style={{ color: isOverdue ? '#e31837' : dl <= 3 ? '#f59e0b' : 'var(--text-muted)' }}>
            {isOverdue
              ? `Overdue by ${Math.abs(dl)} day${Math.abs(dl) !== 1 ? 's' : ''}`
              : dl === 0
              ? 'Due today'
              : `Due ${formatDate(feature.revisedDeadline ?? feature.plannedDeadline)}`
            }
          </span>
        </div>
      </div>
    </article>
  )
}

// ─── Risk Distribution (right sidebar) ───────────────────────────────────────

function RiskDistribution({ features }: { features: Feature[] }) {
  const total = features.length
  if (total === 0) return null

  const categories = [
    {
      label: 'Technical Debt',
      icon: 'code',
      color: '#e31837',
      count: features.filter((f) => f.team === 'Backend' || f.team === 'Fullstack').length,
    },
    {
      label: 'Resource Constraint',
      icon: 'group',
      color: '#f59e0b',
      count: features.filter((f) => f.priority === 'High' || f.priority === 'Critical').length,
    },
    {
      label: 'External Dependency',
      icon: 'link',
      color: '#3b82f6',
      count: features.filter((f) => f.dependencies.length > 0).length,
    },
    {
      label: 'Deadline Pressure',
      icon: 'schedule',
      color: '#a78bfa',
      count: features.filter((f) => daysLeft(f) <= 7 && f.onTrackStatus !== 'Completed').length,
    },
  ]

  return (
    <div className="rk-sidebar-card">
      <p className="rk-sidebar-title">
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>pie_chart</span>
        Risk Distribution
      </p>
      <div className="rk-dist-list">
        {categories.map(({ label, icon, color, count }) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={label} className="rk-dist-row">
              <div className="rk-dist-left">
                <div className="rk-dist-icon" style={{ background: `${color}18` }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 13, color }}>{icon}</span>
                </div>
                <span className="rk-dist-label">{label}</span>
              </div>
              <div className="rk-dist-right">
                <div className="rk-dist-bar">
                  <div className="rk-dist-fill" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="rk-dist-pct" style={{ color }}>{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Escalate Issue panel ─────────────────────────────────────────────────────

function EscalatePanel() {
  return (
    <div className="rk-escalate-card">
      <div className="rk-escalate-icon">
        <span className="material-symbols-rounded" style={{ fontSize: 28, color: '#e31837' }}>campaign</span>
      </div>
      <p className="rk-escalate-title">Escalate Issue</p>
      <p className="rk-escalate-desc">
        Can't resolve a blocker locally? Escalate to the steering committee for immediate intervention.
      </p>
      <button className="rk-escalate-btn" type="button">
        <span className="material-symbols-rounded" style={{ fontSize: 15 }}>send</span>
        Request Steering Review
      </button>
    </div>
  )
}

// ─── Report New Blocker button ────────────────────────────────────────────────

function ReportBlockerPanel({ blockerCount }: { blockerCount: number }) {
  return (
    <div className="rk-sidebar-card rk-report-card">
      <p className="rk-sidebar-title">
        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>add_circle</span>
        Report Blocker
      </p>
      <p className="rk-report-desc">
        Log a new blocker or risk item for the project team to review and address.
      </p>
      <div className="rk-report-stats">
        <div className="rk-report-stat">
          <span className="rk-report-stat-val" style={{ color: '#e31837' }}>{blockerCount}</span>
          <span className="rk-report-stat-label">Open Blockers</span>
        </div>
      </div>
      <button className="rk-report-btn" type="button">
        <span className="material-symbols-rounded" style={{ fontSize: 15 }}>add</span>
        Report New Blocker
      </button>
    </div>
  )
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type RiskFilter = 'All' | 'Critical' | 'At Risk' | 'Deadline Alerts'

const RISK_FILTERS: RiskFilter[] = ['All', 'Critical', 'At Risk', 'Deadline Alerts']

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RisksPage({ features }: { features: Feature[] }) {
  const [activeFilter, setActiveFilter] = useState<RiskFilter>('All')

  // All features that have any issue
  const riskRows = useMemo(
    () =>
      features.filter(
        (f) => f.onTrackStatus !== 'On Track' && f.onTrackStatus !== 'Completed' || deadlineAlerts(f).length > 0,
      ),
    [features],
  )

  const critical  = useMemo(() => features.filter((f) => getSeverity(f) === 'critical'), [features])
  const atRisk    = useMemo(() => features.filter((f) => getSeverity(f) === 'high' || getSeverity(f) === 'medium'), [features])
  const dlAlerts  = useMemo(() => features.filter((f) => deadlineAlerts(f).some((a) => a.type === 'due_soon' || a.type === 'overdue')), [features])

  // resolved this "week" — for demo, features with progress >= 90 or status completed
  const resolvedCount = features.filter((f) => f.status === 'Completed' || f.progress >= 90).length

  const filtered = useMemo(() => {
    if (activeFilter === 'Critical')       return critical
    if (activeFilter === 'At Risk')        return atRisk
    if (activeFilter === 'Deadline Alerts') return dlAlerts
    return riskRows
  }, [activeFilter, riskRows, critical, atRisk, dlAlerts])

  const allClear = riskRows.length === 0

  return (
    <div className="rk-root">
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-text">
          <h1>Risks &amp; Blockers</h1>
          <p>Monitor and mitigate high-priority issues impacting project delivery.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative', zIndex: 1 }}>
          <button className="rk-new-btn" type="button">
            <span className="material-symbols-rounded" style={{ fontSize: 15 }}>add</span>
            Report New Blocker
          </button>
        </div>
      </div>

      {/* ── KPI Summary Row ── */}
      <div className="rk-stats-row">
        <StatCard
          icon="error"
          label="Critical Blockers"
          value={critical.length}
          color="#e31837"
          glowColor="#e31837"
          sub={critical.length === 0 ? 'None active' : `${critical.length} need immediate action`}
        />
        <StatCard
          icon="warning"
          label="At Risk (Next 7 Days)"
          value={atRisk.length + dlAlerts.length}
          color="#f59e0b"
          glowColor="#f59e0b"
          sub="Features approaching deadline"
        />
        <StatCard
          icon="check_circle"
          label="Resolved This Sprint"
          value={resolvedCount}
          color="#22c55e"
          glowColor="#22c55e"
          sub="Completed or ≥90% done"
        />
      </div>

      {/* ── All Clear state ── */}
      {allClear ? (
        <div className="rk-all-clear">
          <div className="rk-all-clear-icon">
            <span className="material-symbols-rounded" style={{ fontSize: 56, color: '#22c55e' }}>verified_user</span>
          </div>
          <h2 className="rk-all-clear-title">All Clear</h2>
          <p className="rk-all-clear-desc">No risks or blockers detected. All features are on track.</p>
        </div>
      ) : (
        <div className="rk-body">
          {/* ── Left main column ── */}
          <div className="rk-main">
            {/* Filter tabs */}
            <div className="rk-filter-tabs">
              {RISK_FILTERS.map((tab) => {
                const count =
                  tab === 'All' ? riskRows.length
                  : tab === 'Critical' ? critical.length
                  : tab === 'At Risk' ? atRisk.length
                  : dlAlerts.length
                return (
                  <button
                    key={tab}
                    type="button"
                    className={`rk-tab${activeFilter === tab ? ' rk-tab-active' : ''}`}
                    onClick={() => setActiveFilter(tab)}
                  >
                    {tab}
                    <span className="rk-tab-count">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Risk cards */}
            {filtered.length === 0 ? (
              <div className="rk-empty">
                <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--text-faint)' }}>search_off</span>
                <p>No items match this filter.</p>
              </div>
            ) : (
              <div className="rk-cards-list">
                {filtered.map((f) => (
                  <RiskCard key={f.featureId} feature={f} />
                ))}
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <aside className="rk-sidebar">
            <RiskDistribution features={riskRows} />
            <EscalatePanel />
            <ReportBlockerPanel blockerCount={critical.length} />
          </aside>
        </div>
      )}
    </div>
  )
}
