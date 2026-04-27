import { Link } from 'react-router-dom'
import { computeSummaryMetrics, phaseHealth } from '../../domain/selectors'
import type { Feature, Phase } from '../../domain/types'
import { Badge, MetricCard, ProgressRing, Section } from '../../shared/ui/components'

/* ── helpers ── */
const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

/* ── Liquid-Fill progress bar ── */
function LiquidBar({ pct, color = 'var(--accent-cyan)' }: { pct: number; color?: string }) {
  return (
    <div style={{ position: 'relative', height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  )
}

/* ── SVG Completion Ring ── */
function CompletionRing({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-cyan)" strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease', filter: 'drop-shadow(0 0 6px var(--accent-cyan))' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Done</span>
      </div>
    </div>
  )
}

const METRIC_CONFIG = [
  { key: 'totalPhases',          title: 'Total Phases',        icon: 'account_tree',    accent: '--accent-blue' },
  { key: 'activePhase',          title: 'Active Phase',        icon: 'play_circle',     accent: '--accent-cyan' },
  { key: 'totalFeatures',        title: 'Total Features',      icon: 'inventory_2',     accent: '--accent-purple' },
  { key: 'completedFeatures',    title: 'Completed',           icon: 'task_alt',        accent: '--accent-green' },
  { key: 'inProgressFeatures',   title: 'In Progress',         icon: 'pending_actions', accent: '--accent-blue' },
  { key: 'atRiskFeatures',       title: 'At Risk',             icon: 'error_outline',   accent: '--accent-amber' },
  { key: 'delayedFeatures',      title: 'Delayed',             icon: 'schedule',        accent: '--brand-primary' },
  { key: 'upcomingThisWeek',     title: 'Upcoming (Week)',     icon: 'event_upcoming',  accent: '--accent-cyan' },
  { key: 'featuresInTesting',    title: 'In Testing',          icon: 'science',         accent: '--accent-purple' },
  { key: 'assignedMembers',      title: 'Assigned Members',   icon: 'group',           accent: '--accent-green' },
] as const

/* ══════════════════════════════════════════════════
   EXECUTIVE (NARRATIVE) VIEW
══════════════════════════════════════════════════ */
function ExecutiveView({ features, phases }: { features: Feature[]; phases: Phase[] }) {
  const overallPct = features.length === 0 ? 0 : Math.round(features.reduce((s, f) => s + f.progress, 0) / features.length)
  const delayedCount = features.filter(f => f.onTrackStatus === 'Delayed' || f.status === 'Delayed').length
  const hasHighRisk = features.some(f => f.priority === 'Critical' && (f.onTrackStatus === 'At Risk' || f.onTrackStatus === 'Delayed'))
  const isAtRisk = hasHighRisk || delayedCount > 2
  const healthLabel = isAtRisk ? 'At Risk' : 'Optimal'

  const today = new Date()
  const activePhase = phases.find(p => {
    const s = new Date(p.startDate), e = new Date(p.targetDate)
    return s <= today && today <= e
  }) ?? phases.find(p => p.status !== 'Completed') ?? phases[0] ?? null

  const activeFeatures = features.filter(f => f.status === 'In Progress' || f.status === 'Testing').slice(0, 3)
  const radarFeatures = features.filter(f => f.status === 'Delayed' || f.onTrackStatus === 'At Risk' || f.onTrackStatus === 'Delayed' || f.isFlagged === true)
  const recentWins = [...features].filter(f => f.status === 'Completed').sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()).slice(0, 3)

  const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 16,
  }

  return (
    <div className="page">
      <style>{`
        @keyframes live-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.75)} }
        @keyframes glow-pulse { 0%,100%{box-shadow:0 0 12px rgba(34,197,94,.35)} 50%{box-shadow:0 0 24px rgba(34,197,94,.7)} }
        @keyframes risk-glow { 0%,100%{box-shadow:0 0 12px rgba(239,68,68,.35)} 50%{box-shadow:0 0 24px rgba(239,68,68,.7)} }
        .exec-card { padding: 1.5rem; display: flex; flex-direction: column; gap: .75rem; }
        .exec-velocity-card:hover { border-color: rgba(6,182,212,.3) !important; }
        .radar-item:hover { background: rgba(239,68,68,.07) !important; }
        .win-item:hover { background: rgba(34,197,94,.07) !important; }
      `}</style>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Executive Overview</h1>
          <p>Real-time telemetry for active initiatives.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'var(--accent-green-muted)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--accent-green)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', animation: 'live-pulse 2s ease infinite' }} />
            LIVE
          </div>
        </div>
      </div>

      {/* Row 1 — Vital Signs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Health Card */}
        <div className="exec-card" style={{ ...glass, animation: isAtRisk ? 'risk-glow 2.5s ease infinite' : 'glow-pulse 3s ease infinite' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: isAtRisk ? '#ef4444' : 'var(--accent-green)' }}>
              {isAtRisk ? 'warning' : 'verified'}
            </span>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Project Health</p>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 800, color: isAtRisk ? '#ef4444' : 'var(--accent-green)', lineHeight: 1 }}>{healthLabel}</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {isAtRisk ? `${delayedCount} delayed feature${delayedCount !== 1 ? 's' : ''} require attention` : 'All systems operating within expected parameters'}
          </p>
        </div>

        {/* Completion Ring Card */}
        <div className="exec-card" style={{ ...glass, alignItems: 'center', flexDirection: 'row', gap: '1.25rem' }}>
          <CompletionRing pct={overallPct} size={110} />
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Overall Completion</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {features.filter(f => f.status === 'Completed').length} of {features.length} features delivered
            </p>
            {activePhase?.targetDate && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                Target: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{fmt(activePhase.targetDate)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Active Phase Card */}
        <div className="exec-card" style={{ ...glass }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 22, color: 'var(--accent-blue)' }}>account_tree</span>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Active Phase</p>
          </div>
          {activePhase ? (
            <>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>{activePhase.phaseName}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Badge label={activePhase.status} tone={activePhase.status === 'Delayed' ? 'danger' : activePhase.status === 'Completed' ? 'success' : 'info'} />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Deadline: <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{fmt(activePhase.targetDate)}</span>
              </p>
            </>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active phase found.</p>
          )}
        </div>
      </div>

      {/* Row 2 — Velocity + Radar (60/40) */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Current Velocity */}
        <div style={{ ...glass, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--accent-cyan)' }}>speed</span>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Current Velocity</p>
            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Features</span>
          </div>
          {activeFeatures.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 36, display: 'block', marginBottom: '0.5rem' }}>hourglass_empty</span>
              <p style={{ fontSize: '0.85rem' }}>No features currently in progress.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {activeFeatures.map(f => (
                <div key={f.featureId} className="exec-velocity-card" style={{ ...glass, padding: '1rem', transition: 'border-color .2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{f.featureName}</p>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>{f.progress}%</span>
                  </div>
                  <LiquidBar pct={f.progress} />
                  {f.currentTask && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Current Task:</span> {f.currentTask}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* The Radar */}
        <div style={{ ...glass, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: '#ef4444' }}>radar</span>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>The Radar</p>
          </div>
          {radarFeatures.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(34,197,94,.12)', border: '2px solid rgba(34,197,94,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 28, color: 'var(--accent-green)' }}>shield</span>
              </div>
              <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--accent-green)' }}>All Systems Nominal</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>No critical blockers or at-risk features detected.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {radarFeatures.slice(0, 5).map(f => (
                <div key={f.featureId} className="radar-item" style={{ padding: '0.6rem 0.75rem', borderRadius: 10, background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)', transition: 'background .2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{f.featureName}</p>
                    {f.isFlagged && <span title={f.flagReason} style={{ fontSize: '0.75rem', cursor: 'help' }}>🚩</span>}
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginTop: '0.15rem' }}>
                    {f.isFlagged && f.flagReason ? `Flagged: ${f.flagReason}` : f.onTrackStatus}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3 — Recent Wins */}
      {recentWins.length > 0 && (
        <div style={{ ...glass, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--accent-green)' }}>emoji_events</span>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>Recent Wins</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {recentWins.map(f => (
              <div key={f.featureId} className="win-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.15)', transition: 'background .2s' }}>
                <span className="material-symbols-rounded" style={{ fontSize: 20, color: 'var(--accent-green)', flexShrink: 0 }}>task_alt</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{f.featureName}</p>
                  {f.executiveSummary && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.executiveSummary}</p>}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{fmt(f.lastUpdatedAt)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   ADMIN / DEV (GRANULAR) VIEW
══════════════════════════════════════════════════ */
function AdminView({ features, phases, role }: { features: Feature[]; phases: Phase[]; role: 'admin' | 'dev' }) {
  const summary = computeSummaryMetrics(features, phases)
  const phaseRows = phaseHealth(phases, features)
  const flaggedFeatures = features.filter(f => f.isFlagged === true)

  return (
    <>
      <style>{`
        @keyframes live-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.75)} }
        @keyframes flag-ring { 0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)} 70%{box-shadow:0 0 0 8px rgba(239,68,68,0)} }
      `}</style>
      <div className="page">
        {features.length === 0 && role === 'admin' && (
          <div className="section" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', background: 'rgba(227,24,55,0.08)', border: '1px solid rgba(227,24,55,0.25)', borderRadius: 10, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text)' }}>No features in the database yet.</strong>{' '}
            Use <Link to="/uploads" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Uploads</Link> to import a CSV or add rows in Supabase.
          </div>
        )}

        {/* 🚩 Flagged Alert Banner */}
        {flaggedFeatures.length > 0 && (
          <div style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', flexShrink: 0, animation: 'flag-ring 1.5s ease infinite' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ef4444' }}>
                🚩 {flaggedFeatures.length} Feature{flaggedFeatures.length !== 1 ? 's' : ''} Flagged for Review
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {flaggedFeatures.map(f => f.featureName).join(', ')}
              </p>
            </div>
            <Link to="/features?resolve=true" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', border: '1px solid rgba(239,68,68,.4)', padding: '0.3rem 0.75rem', borderRadius: 8, textDecoration: 'none', flexShrink: 0 }}>
              Review →
            </Link>
          </div>
        )}

        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-text">
            <h1>Portfolio Overview</h1>
            <p>Real-time metrics and high-level deliverables across all active divisions.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 1 }}>
            <ProgressRing pct={summary.overallCompletionPct} size={80} />
            <div>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Overall</p>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Completion</p>
            </div>
          </div>
        </div>

        {/* KPI Metrics Grid */}
        <Section title="Portfolio Metrics">
          <div className="grid grid-metrics">
            {METRIC_CONFIG.map(m => (
              <MetricCard key={m.key} title={m.title} value={summary[m.key as keyof typeof summary] as string | number} icon={m.icon} accent={m.accent} />
            ))}
          </div>
        </Section>

        {/* Phase Overview */}
        <Section title="Phase Overview">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {phaseRows.map(row => {
              const completionPct = row.total === 0 ? 0 : Math.round((row.completed / row.total) * 100)
              return (
                <article className="phase-card" key={row.phase.phaseId}>
                  <div className="row-between">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className="material-symbols-rounded" style={{ color: 'var(--accent-blue)', fontSize: 18 }}>account_tree</span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{row.phase.phaseName}</p>
                        <p className="small">{fmt(row.phase.startDate)} → {fmt(row.phase.targetDate)}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{completionPct}%</p>
                        <p className="small">{row.completed}/{row.total} done</p>
                      </div>
                      <Badge label={row.health} tone={row.health === 'Delayed' ? 'danger' : row.health === 'On Track' ? 'success' : 'info'} />
                    </div>
                  </div>
                  <div className="phase-progress-bar" style={{ marginTop: '0.85rem' }}>
                    <div className="phase-progress-fill" style={{ width: `${completionPct}%` }} />
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.6rem' }}>
                    {[{ label: 'Total', value: row.total, color: 'var(--text-muted)' }, { label: 'In Progress', value: row.inProgress, color: 'var(--accent-blue)' }, { label: 'Completed', value: row.completed, color: 'var(--accent-green)' }, { label: 'Delayed', value: row.delayed, color: 'var(--brand-primary)' }].map(({ label, value, color }) => (
                      <div key={label}>
                        <p style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{value}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                      </div>
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </Section>
      </div>
    </>
  )
}

/* ══════════════════════════════════════════════════
   ROOT EXPORT — Role Branch
══════════════════════════════════════════════════ */
export function OverviewPage({ features, phases, role }: { features: Feature[]; phases: Phase[]; role: 'executive' | 'admin' | 'dev' }) {
  if (role === 'executive') return <ExecutiveView features={features} phases={phases} />
  return <AdminView features={features} phases={phases} role={role} />
}
