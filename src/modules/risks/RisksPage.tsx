import { useMemo, useState } from 'react'
import { daysUntilDeadline, deadlineAlerts, getSeverityLevel, type SeverityLevel } from '../../domain/rules'
import { getInitials, formatDate, avatarGradient } from '../../shared/utils/formatters'
import type { Feature, Blocker, BlockerSeverity, BlockerLog } from '../../domain/types'
import { Badge } from '../../shared/ui/components'
import { useBlockers } from '../../hooks/useBlockers'

// ─── helpers ─────────────────────────────────────────────────────────────────


const SEVERITY_META: Record<string, { label: string; color: string; borderColor: string; bgColor: string }> = {
  critical: { label: 'Critical', color: '#e31837', borderColor: '#e31837',  bgColor: 'rgba(227,24,55,0.08)' },
  high:     { label: 'High',     color: '#f59e0b', borderColor: '#f59e0b',  bgColor: 'rgba(245,158,11,0.08)' },
  medium:   { label: 'Medium',   color: '#f59e0b', borderColor: '#f59e0b',  bgColor: 'rgba(245,158,11,0.06)' },
  low:      { label: 'Low',      color: '#64748b', borderColor: '#334155',  bgColor: 'rgba(255,255,255,0.03)' },
}

// ─── KPI Stat Card ────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: string
  label: string
  value: number | string
  color: string
  glowColor: string
  sub?: string
  onClick?: () => void
}

function StatCard({ icon, label, value, color, glowColor, sub, onClick }: StatCardProps) {
  return (
    <div 
      className="rk-stat-card" 
      style={{ '--rk-accent': color, '--rk-glow': glowColor, cursor: onClick ? 'pointer' : 'default' } as React.CSSProperties}
      onClick={onClick}
    >
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


// ─── Risk Card (For Features) ──────────────────────────────────────────────────

function RiskCard({ feature }: { feature: Feature }) {
  const severity = getSeverityLevel(feature)
  const meta = SEVERITY_META[severity]
  const alerts = deadlineAlerts(feature)
  const dl = daysUntilDeadline(feature)

  const hasBlocker = !!feature.blockerNote
  const hasWaitingOn = feature.dependencies.length > 0 || hasBlocker
  const isOverdue = dl < 0

  return (
    <article className="rk-card" style={{ borderLeftColor: meta.borderColor }}>
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
      {feature.executiveSummary && (
        <p className="rk-card-desc">{feature.executiveSummary}</p>
      )}
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
            {isOverdue ? `Overdue by ${Math.abs(dl)} day${Math.abs(dl) !== 1 ? 's' : ''}` : dl === 0 ? 'Due today' : `Due ${formatDate(feature.revisedDeadline ?? feature.plannedDeadline)}`}
          </span>
        </div>
      </div>
    </article>
  )
}

// ─── Blocker Card (For Blockers) ──────────────────────────────────────────────

function BlockerCard({ blocker, features, onSelect, selected, onAddNote }: { blocker: Blocker; features: Feature[]; onSelect: () => void; selected: boolean; onAddNote?: () => void }) {
  const feature = features.find(f => f.featureId === blocker.featureId)
  const meta = SEVERITY_META[blocker.severity.toLowerCase()] || SEVERITY_META.medium
  
  return (
    <article 
      className="rk-card" 
      style={{ 
        borderLeftColor: meta.borderColor, 
        cursor: 'pointer',
        boxShadow: selected ? `0 0 0 2px ${meta.color}40` : undefined,
        background: selected ? 'var(--surface-raised)' : undefined
      }} 
      onClick={onSelect}
    >
      <div className="rk-card-header">
        <div className="rk-card-title-row">
          <span className="material-symbols-rounded" style={{ fontSize: 18, color: meta.color, flexShrink: 0 }}>
            {blocker.severity === 'Critical' ? 'error' : 'warning'}
          </span>
          <div>
            <p className="rk-card-name">{blocker.title}</p>
            <p className="rk-card-module">{feature ? `Blocks: ${feature.featureName}` : 'General Blocker'}</p>
          </div>
        </div>
        <div className="rk-card-badges">
          <span className="rk-severity-badge" style={{ background: `${meta.color}22`, color: meta.color, borderColor: `${meta.color}40` }}>
            {blocker.severity}
          </span>
          <Badge label={blocker.status} tone={blocker.status === 'Resolved' ? 'success' : blocker.status === 'Escalated' ? 'warn' : 'danger'} />
        </div>
      </div>
      {blocker.description && <p className="rk-card-desc">{blocker.description}</p>}
      
      <div className="rk-card-footer">
        <div className="rk-card-owner">
          <div className="rk-owner-avatar" style={{ background: avatarGradient(blocker.createdBy || 'Unknown') }}>
            {getInitials(blocker.createdBy || 'U')}
          </div>
          <div>
            <p className="rk-owner-name">Reported by {blocker.createdBy || 'Unknown'}</p>
            <p className="rk-owner-team">{blocker.category || 'General'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div className="rk-card-deadline">
            <span className="material-symbols-rounded" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              calendar_today
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {formatDate(blocker.createdAt)}
            </span>
          </div>
          {onAddNote && (
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); onAddNote(); }}
              style={{ padding: '4px 8px', fontSize: '11px', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-base)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 13 }}>edit_note</span>
              Add Note
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

// ─── History Timeline ────────────────────────────────────────────────────────

function HistoryTimeline({ logs, blockers }: { logs: BlockerLog[], blockers: Blocker[] }) {
  if (logs.length === 0) {
    return (
      <div className="rk-empty">
        <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--text-faint)' }}>history</span>
        <p>No history recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="rk-history-timeline" style={{ padding: '1.5rem', background: 'var(--bg-sidebar)', borderRadius: '12px', border: '1px solid var(--border)' }}>
      {logs.map((log, i) => {
        const blocker = blockers.find(b => b.id === log.blockerId)
        return (
          <div key={log.id} style={{ display: 'flex', gap: '1.25rem', marginBottom: i === logs.length - 1 ? 0 : '1.5rem', position: 'relative' }}>
            {i !== logs.length - 1 && <div style={{ position: 'absolute', left: '17px', top: '36px', bottom: '-20px', width: '2px', background: 'var(--border)' }} />}
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-base)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, flexShrink: 0 }}>
              <span className="material-symbols-rounded" style={{ fontSize: 18, color: log.action.includes('Decision') ? '#f59e0b' : log.action.includes('Resolved') ? '#22c55e' : log.action.includes('Escalated') ? '#e31837' : 'var(--text-muted)' }}>
                {log.action.includes('Created') ? 'add' : log.action.includes('Decision') ? 'gavel' : log.action.includes('Resolved') ? 'check_circle' : log.action.includes('Escalated') ? 'campaign' : 'note'}
              </span>
            </div>
            <div style={{ flex: 1, paddingTop: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-base)', fontSize: '0.95rem' }}>{log.action}</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(log.createdAt)}</span>
              </div>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {blocker ? `Blocker: ${blocker.title}` : 'Unknown Blocker'}
              </p>
              {log.notes && (
                <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-base)', lineHeight: 1.5 }}>
                  {log.notes}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Risk Distribution (right sidebar) ───────────────────────────────────────

function RiskDistribution({ features, blockers }: { features: Feature[], blockers: Blocker[] }) {
  const total = blockers.length
  if (total === 0) return null

  const categories = [
    { label: 'Technical Debt', icon: 'code', color: '#e31837', count: blockers.filter((b) => b.category === 'Technical Debt').length },
    { label: 'Resource Constraint', icon: 'group', color: '#f59e0b', count: blockers.filter((b) => b.category === 'Resource Constraint').length },
    { label: 'External Dependency', icon: 'link', color: '#3b82f6', count: blockers.filter((b) => b.category === 'External Dependency').length },
    { label: 'Other', icon: 'help', color: '#a78bfa', count: blockers.filter((b) => !['Technical Debt', 'Resource Constraint', 'External Dependency'].includes(b.category)).length },
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

function EscalatePanel({ onEscalate, disabled }: { onEscalate: () => void; disabled: boolean }) {
  return (
    <div className="rk-escalate-card">
      <div className="rk-escalate-icon">
        <span className="material-symbols-rounded" style={{ fontSize: 28, color: '#e31837' }}>campaign</span>
      </div>
      <p className="rk-escalate-title">Escalate Issue</p>
      <p className="rk-escalate-desc">
        Can't resolve a blocker locally? Escalate to the steering committee for immediate intervention. Select a blocker first.
      </p>
      <button className="rk-escalate-btn" type="button" onClick={onEscalate} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
        <span className="material-symbols-rounded" style={{ fontSize: 15 }}>send</span>
        Request Steering Review
      </button>
    </div>
  )
}

// ─── Report New Blocker button ────────────────────────────────────────────────

function ReportBlockerPanel({ blockerCount, onReport }: { blockerCount: number; onReport: () => void }) {
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
      <button className="rk-report-btn" type="button" onClick={onReport}>
        <span className="material-symbols-rounded" style={{ fontSize: 15 }}>add</span>
        Report New Blocker
      </button>
    </div>
  )
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type RiskFilter = 'All' | 'Blockers' | 'Features At Risk' | 'History'

const RISK_FILTERS: RiskFilter[] = ['All', 'Blockers', 'Features At Risk', 'History']

// ─── Main Page ────────────────────────────────────────────────────────────────

export function RisksPage({ features, role = 'admin' }: { features: Feature[]; role?: 'admin' | 'executive' | 'dev' }) {
  const [activeFilter, setActiveFilter] = useState<RiskFilter>('All')
  const { blockers, createBlocker, escalateBlocker, resolveBlocker, addBlockerLog, allLogs } = useBlockers()
  
  const [showModal, setShowModal] = useState(false)
  const [selectedBlockerId, setSelectedBlockerId] = useState<string | null>(null)
  
  // Resolved Modal State
  const [showResolvedModal, setShowResolvedModal] = useState(false)

  // Note Modal State
  const [addNoteBlockerId, setAddNoteBlockerId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  
  // Decision Modal State
  const [decisionModalBlockerId, setDecisionModalBlockerId] = useState<string | null>(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false)
  
  // Modal Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Technical Debt')
  const [severity, setSeverity] = useState<BlockerSeverity>('Medium')
  const [featureId, setFeatureId] = useState('')

  // KPI Data
  const openBlockers = blockers.filter(b => b.status !== 'Resolved')
  const criticalBlockers = openBlockers.filter(b => b.severity === 'Critical')
  
  // Keep original feature at risk logic for the "At Risk" metric
  const featuresAtRisk = useMemo(() => features.filter((f) => getSeverityLevel(f) === 'high' || getSeverityLevel(f) === 'medium' || deadlineAlerts(f).some((a) => a.type === 'due_soon' || a.type === 'overdue')), [features])
  
  const resolvedCount = blockers.filter(b => b.status === 'Resolved').length

  const handleCreateBlocker = async () => {
    if (!title) return
    await createBlocker({
      title,
      description,
      category,
      severity,
      featureId: featureId || undefined
    })
    setShowModal(false)
    setTitle('')
    setDescription('')
  }

  const handleEscalate = async () => {
    if (selectedBlockerId) {
      await escalateBlocker(selectedBlockerId)
      setSelectedBlockerId(null)
    }
  }

  const handleExecutiveDecision = async (decision: string) => {
    if (!decisionModalBlockerId) return
    setIsSubmittingDecision(true)
    try {
      await addBlockerLog(decisionModalBlockerId, `Executive Decision: ${decision}`, decisionNote)
      await resolveBlocker(decisionModalBlockerId)
    } finally {
      setIsSubmittingDecision(false)
      setDecisionModalBlockerId(null)
      setDecisionNote('')
    }
  }

  const handleAddNote = async () => {
    if (!addNoteBlockerId || !noteText) return
    setIsSubmittingNote(true)
    try {
      await addBlockerLog(addNoteBlockerId, 'Note Added', noteText)
    } finally {
      setIsSubmittingNote(false)
      setAddNoteBlockerId(null)
      setNoteText('')
    }
  }

  const allClear = openBlockers.length === 0 && featuresAtRisk.length === 0

  const renderItems = () => {
    if (role === 'executive') {
      if (activeFilter === 'History') {
        return <HistoryTimeline logs={allLogs} blockers={blockers} />
      }

      const escalatedBlockers = blockers.filter(b => b.status === 'Escalated')
      const otherBlockers = blockers.filter(b => b.status !== 'Escalated' && b.status !== 'Resolved')

      if (escalatedBlockers.length === 0 && otherBlockers.length === 0) {
        return (
          <div className="rk-empty">
            <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--text-faint)' }}>inbox</span>
            <p>Steering Inbox is empty. No active blockers.</p>
          </div>
        )
      }

      return (
        <div className="rk-cards-list">
          {escalatedBlockers.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e31837', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>campaign</span>
                Escalated for Steering Review
              </h3>
              <div className="rk-cards-list">
                {escalatedBlockers.map(b => (
                  <BlockerCard 
                    key={b.id} 
                    blocker={b} 
                    features={features} 
                    selected={decisionModalBlockerId === b.id}
                    onSelect={() => setDecisionModalBlockerId(b.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {otherBlockers.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 18 }}>warning</span>
                Other Active Blockers
              </h3>
              <div className="rk-cards-list">
                {otherBlockers.map(b => (
                  <BlockerCard 
                    key={b.id} 
                    blocker={b} 
                    features={features} 
                    selected={decisionModalBlockerId === b.id}
                    onSelect={() => setDecisionModalBlockerId(b.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    if (activeFilter === 'History') {
      return <HistoryTimeline logs={allLogs} blockers={blockers} />
    }

    const items = []
    
    if (activeFilter === 'All' || activeFilter === 'Blockers') {
      items.push(...openBlockers.map(b => (
        <BlockerCard 
          key={b.id} 
          blocker={b} 
          features={features} 
          selected={selectedBlockerId === b.id}
          onSelect={() => setSelectedBlockerId(b.id === selectedBlockerId ? null : b.id)}
          onAddNote={role === 'admin' ? () => setAddNoteBlockerId(b.id) : undefined}
        />
      )))
    }
    
    if (activeFilter === 'All' || activeFilter === 'Features At Risk') {
      items.push(...featuresAtRisk.map(f => (
        <RiskCard key={f.featureId} feature={f} />
      )))
    }
    
    if (items.length === 0) {
      return (
        <div className="rk-empty">
          <span className="material-symbols-rounded" style={{ fontSize: 40, color: 'var(--text-faint)' }}>search_off</span>
          <p>No items match this filter.</p>
        </div>
      )
    }
    
    return <div className="rk-cards-list">{items}</div>
  }

  return (
    <div className="rk-root">
      {/* ── Page Header ── */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div className="page-header-text">
          <h1>Risks &amp; Blockers</h1>
          <p>Monitor and mitigate high-priority issues impacting project delivery.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative', zIndex: 1 }}>
          {role !== 'executive' && (
            <button className="rk-new-btn" type="button" onClick={() => setShowModal(true)}>
              <span className="material-symbols-rounded" style={{ fontSize: 15 }}>add</span>
              Report New Blocker
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Summary Row ── */}
      <div className="rk-stats-row">
        <StatCard
          icon="error"
          label="Critical Blockers"
          value={criticalBlockers.length}
          color="#e31837"
          glowColor="#e31837"
          sub={criticalBlockers.length === 0 ? 'None active' : `${criticalBlockers.length} need immediate action`}
        />
        <StatCard
          icon="warning"
          label="Features At Risk"
          value={featuresAtRisk.length}
          color="#f59e0b"
          glowColor="#f59e0b"
          sub="Features approaching deadline or blocked"
        />
        <StatCard
          icon="check_circle"
          label="Resolved Blockers"
          value={resolvedCount}
          color="#22c55e"
          glowColor="#22c55e"
          sub="Successfully mitigated"
          onClick={() => setShowResolvedModal(true)}
        />
      </div>

      {/* ── All Clear state ── */}
      {allClear && activeFilter === 'All' ? (
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
            {role !== 'executive' ? (
              <div className="rk-filter-tabs">
                {RISK_FILTERS.map((tab) => {
                  const count =
                    tab === 'All' ? openBlockers.length + featuresAtRisk.length
                    : tab === 'Blockers' ? openBlockers.length
                    : featuresAtRisk.length
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
            ) : (
              <div className="rk-filter-tabs">
                <button type="button" className={`rk-tab${activeFilter !== 'History' ? ' rk-tab-active' : ''}`} onClick={() => setActiveFilter('All')}>
                  Steering Inbox
                  <span className="rk-tab-count">{openBlockers.length}</span>
                </button>
                <button type="button" className={`rk-tab${activeFilter === 'History' ? ' rk-tab-active' : ''}`} onClick={() => setActiveFilter('History')}>
                  History
                </button>
              </div>
            )}

            {/* Risk cards */}
            {renderItems()}
          </div>

          {/* ── Right sidebar ── */}
          <aside className="rk-sidebar">
            <RiskDistribution features={features} blockers={openBlockers} />
            {role !== 'executive' && (
              <>
                <EscalatePanel onEscalate={handleEscalate} disabled={!selectedBlockerId} />
                <ReportBlockerPanel blockerCount={openBlockers.length} onReport={() => setShowModal(true)} />
              </>
            )}
          </aside>
        </div>
      )}

      {/* ── Decision Modal ── */}
      {decisionModalBlockerId && role === 'executive' && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: 'var(--bg-sidebar)', padding: '0', borderRadius: '16px', width: '480px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            {(() => {
              const b = blockers.find(x => x.id === decisionModalBlockerId)
              const meta = b ? (SEVERITY_META[b.severity.toLowerCase()] || SEVERITY_META.medium) : SEVERITY_META.medium
              return (
                <>
                  <div style={{ padding: '2rem 2rem 1.5rem', background: `linear-gradient(to bottom, ${meta.color}10, transparent)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
                        <span className="material-symbols-rounded">{b?.severity === 'Critical' ? 'error' : 'gavel'}</span>
                      </div>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-base)' }}>Executive Decision</h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Select a resolution for this blocker</p>
                      </div>
                    </div>
                    
                    {b && (
                      <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: '8px', border: `1px solid ${meta.borderColor}40`, marginBottom: '1.5rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: 'var(--text-base)' }}>{b.title}</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{b.description || 'No description provided.'}</p>
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>Executive Rationale (Optional)</label>
                      <textarea 
                        style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'white', borderRadius: '8px', minHeight: '80px', fontSize: '0.9rem', resize: 'vertical' }} 
                        value={decisionNote} 
                        onChange={e => setDecisionNote(e.target.value)} 
                        placeholder="Provide specific instructions or rationale..." 
                      />
                    </div>
                  </div>

                  <div style={{ padding: '1.5rem 2rem', background: 'var(--bg-base)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                      style={{ padding: '0.875rem', background: 'rgba(227,24,55,0.1)', border: '1px solid rgba(227,24,55,0.2)', color: '#e31837', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} 
                      onClick={() => handleExecutiveDecision('Approve Deadline Extension')}
                      disabled={isSubmittingDecision}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(227,24,55,0.15)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(227,24,55,0.1)'}
                    >
                      Approve Deadline Extension
                    </button>
                    <button 
                      style={{ padding: '0.875rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} 
                      onClick={() => handleExecutiveDecision('Approve Scope Reduction')}
                      disabled={isSubmittingDecision}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(245,158,11,0.15)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
                    >
                      Approve Scope Reduction
                    </button>
                    <button 
                      style={{ padding: '0.875rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} 
                      onClick={() => handleExecutiveDecision('Acknowledge & Monitor')}
                      disabled={isSubmittingDecision}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                    >
                      Acknowledge & Monitor
                    </button>
                    <button 
                      style={{ padding: '0.875rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', marginTop: '0.5rem', fontWeight: 500, transition: 'all 0.2s' }} 
                      onClick={() => { setDecisionModalBlockerId(null); setDecisionNote(''); }}
                      onMouseOver={e => e.currentTarget.style.color = 'var(--text-base)'}
                      onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── Add Note Modal ── */}
      {addNoteBlockerId && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: 'var(--bg-sidebar)', padding: '2rem', borderRadius: '12px', width: '400px', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 1rem 0', color: 'var(--text-base)' }}>Add Note</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Add additional context or updates to this blocker.</p>
            
            <textarea 
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'white', borderRadius: '8px', minHeight: '100px', resize: 'vertical' }} 
              value={noteText} 
              onChange={e => setNoteText(e.target.value)} 
              placeholder="Enter your note here..." 
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button 
                style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer' }} 
                onClick={() => { setAddNoteBlockerId(null); setNoteText(''); }}
              >
                Cancel
              </button>
              <button 
                style={{ padding: '0.5rem 1rem', background: 'var(--text-base)', border: 'none', color: 'var(--bg-base)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }} 
                onClick={handleAddNote}
                disabled={isSubmittingNote || !noteText.trim()}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: 'var(--bg-sidebar)', padding: '2rem', borderRadius: '12px', width: '400px', border: '1px solid var(--border)' }}>
            <h2 style={{ margin: '0 0 1rem 0' }}>Report New Blocker</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</label>
                <input style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'white', borderRadius: '4px' }} value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g. API Gateway timeout" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Feature (Optional)</label>
                <select style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'white', borderRadius: '4px' }} value={featureId} onChange={e => setFeatureId(e.target.value)}>
                  <option value="">-- None --</option>
                  {features.map(f => (
                    <option key={f.featureId} value={f.featureId}>{f.featureName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Severity</label>
                <select style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'white', borderRadius: '4px' }} value={severity} onChange={e => setSeverity(e.target.value as BlockerSeverity)}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Category</label>
                <select style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'white', borderRadius: '4px' }} value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="Technical Debt">Technical Debt</option>
                  <option value="Resource Constraint">Resource Constraint</option>
                  <option value="External Dependency">External Dependency</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Description</label>
                <textarea style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'white', borderRadius: '4px', minHeight: '80px' }} value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', color: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={{ padding: '0.5rem 1rem', background: '#e31837', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={handleCreateBlocker} disabled={!title}>Report Blocker</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolved Blockers Modal ── */}
      {showResolvedModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: 'var(--bg-sidebar)', padding: '2rem', borderRadius: '12px', width: '640px', maxHeight: '85vh', border: '1px solid var(--border)', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-sidebar)', padding: '2rem 2rem 1rem 2rem', margin: '-2rem -2rem 1.5rem -2rem', zIndex: 10, borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ margin: 0, color: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-rounded" style={{ color: '#22c55e', fontSize: 20 }}>check_circle</span>
                </div>
                Resolved Blockers History
              </h2>
              <button 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} 
                onClick={() => setShowResolvedModal(false)}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            
            {(() => {
              const resolvedList = blockers.filter(b => b.status === 'Resolved');
              if (resolvedList.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 48, color: 'var(--text-faint)', marginBottom: '1rem' }}>inbox</span>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>No resolved blockers to show.</p>
                  </div>
                );
              }
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {resolvedList.map(b => {
                    const logsForBlocker = allLogs.filter(l => l.blockerId === b.id).sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());
                    const f = features.find(feat => feat.featureId === b.featureId);
                    return (
                      <div key={b.id} style={{ padding: '1.25rem', background: 'var(--bg-base)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div>
                            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-base)', fontSize: '1rem' }}>{b.title}</h4>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {f ? `Feature: ${f.featureName}` : 'General Blocker'} • {b.category}
                            </p>
                          </div>
                          <Badge label="Resolved" tone="info" />
                        </div>
                        {b.description && (
                          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            {b.description}
                          </p>
                        )}
                        
                        {logsForBlocker.length > 0 && (
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolution & Notes History</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {logsForBlocker.map((log, i) => {
                                const isDecision = log.action.includes('Decision') || log.action.includes('Resolved') || log.action.includes('Approve');
                                return (
                                  <div key={log.id} style={{ position: 'relative' }}>
                                    {i !== logsForBlocker.length - 1 && <div style={{ position: 'absolute', left: '11px', top: '24px', bottom: '-16px', width: '2px', background: 'var(--border)' }} />}
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-sidebar)', border: `1px solid ${isDecision ? '#f59e0b' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, flexShrink: 0, marginTop: '2px' }}>
                                        <span className="material-symbols-rounded" style={{ fontSize: 12, color: isDecision ? '#f59e0b' : 'var(--text-muted)' }}>
                                          {log.action.includes('Created') ? 'add' : log.action.includes('Resolved') || log.action.includes('Approve') ? 'check' : isDecision ? 'gavel' : 'note'}
                                        </span>
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                                          <span style={{ fontWeight: 500, color: 'var(--text-base)', fontSize: '0.85rem' }}>{log.action}</span>
                                          <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>{formatDate(log.createdAt)}</span>
                                        </div>
                                        {log.notes && (
                                          <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', borderLeft: `2px solid ${isDecision ? '#f59e0b' : 'var(--border)'}`, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, marginTop: '0.5rem' }}>
                                            {log.notes}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
