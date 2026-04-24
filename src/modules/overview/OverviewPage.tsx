import { computeSummaryMetrics, phaseHealth } from '../../domain/selectors'
import type { Feature, Phase } from '../../domain/types'
import { Badge, ExternalLinkButton, MetricCard, ProgressRing, Section } from '../../shared/ui/components'

const METRIC_CONFIG = [
  { key: 'totalPhases',          title: 'Total Phases',        icon: 'account_tree',   accent: '--accent-blue' },
  { key: 'activePhase',          title: 'Active Phase',        icon: 'play_circle',    accent: '--accent-cyan' },
  { key: 'totalFeatures',        title: 'Total Features',      icon: 'inventory_2',    accent: '--accent-purple' },
  { key: 'completedFeatures',    title: 'Completed',           icon: 'task_alt',       accent: '--accent-green' },
  { key: 'inProgressFeatures',   title: 'In Progress',         icon: 'pending_actions',accent: '--accent-blue' },
  { key: 'atRiskFeatures',       title: 'At Risk',             icon: 'error_outline',  accent: '--accent-amber' },
  { key: 'delayedFeatures',      title: 'Delayed',             icon: 'schedule',       accent: '--brand-primary' },
  { key: 'upcomingThisWeek',     title: 'Upcoming (Week)',     icon: 'event_upcoming', accent: '--accent-cyan' },
  { key: 'featuresInTesting',    title: 'In Testing',          icon: 'science',        accent: '--accent-purple' },
  { key: 'assignedMembers',      title: 'Assigned Members',    icon: 'group',          accent: '--accent-green' },
  { key: 'overallCompletionPct', title: 'Overall Completion',  icon: 'donut_large',    accent: '--accent-blue' },
] as const

export function OverviewPage({
  features,
  phases,
  role,
}: {
  features: Feature[]
  phases: Phase[]
  role: 'executive' | 'admin'
}) {
  const summary = computeSummaryMetrics(features, phases)
  const phaseRows = phaseHealth(phases, features)
  const spotlight = features.filter((f) => f.mvpUrl || f.srsRequirementId || f.executiveSummary)

  return (
    <>
      <style>{`
        @keyframes live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(0.75); }
        }
      `}</style>
      <div className="page">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Executive Overview</h1>
          <p>Real-time pulse on portfolio performance and major deliverables.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative', zIndex: 1 }}>
          {role === 'executive' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 12px',
                background: 'var(--accent-green-muted)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 20,
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.07em',
                color: 'var(--accent-green)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--accent-green)',
                  display: 'inline-block',
                  animation: 'live-pulse 2s ease infinite',
                  flexShrink: 0,
                }}
              />
              LIVE
            </div>
          )}
          <ProgressRing pct={summary.overallCompletionPct} size={80} />
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Overall</p>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Completion</p>
          </div>
        </div>
      </div>

      {/* ── KPI Metrics ── */}
      <Section title="Portfolio Metrics">
        <div className="grid grid-metrics">
          {METRIC_CONFIG.filter((m) => m.key !== 'overallCompletionPct').map((m) => (
            <MetricCard
              key={m.key}
              title={m.title}
              value={summary[m.key as keyof typeof summary] as string | number}
              icon={m.icon}
              accent={m.accent}
            />
          ))}
        </div>
      </Section>

      {/* ── Deliverables Spotlight ── */}
      {spotlight.length > 0 ? (
        <Section
          title="Major Deliverables"
          action={<span className="badge badge-info">{spotlight.length} items</span>}
        >
          <div className="grid spotlight-grid">
            {spotlight.map((f) => (
              <article className="spotlight-card" key={f.featureId}
                style={f.onTrackStatus === 'Delayed' ? { borderLeftColor: 'var(--brand-primary)' } : f.onTrackStatus === 'Completed' ? { borderLeftColor: 'var(--accent-green)' } : undefined}
              >
                <div className="row-between">
                  <h3>{f.featureName}</h3>
                  <Badge
                    label={f.onTrackStatus}
                    tone={
                      f.onTrackStatus === 'Delayed' ? 'danger'
                      : f.onTrackStatus === 'Completed' ? 'success'
                      : f.onTrackStatus === 'On Track' ? 'success'
                      : 'warn'
                    }
                  />
                </div>
                {f.executiveSummary && role === 'executive' ? (
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.55,
                      marginTop: '0.4rem',
                      padding: '0.5rem 0.75rem',
                      background: 'rgba(255,255,255,0.03)',
                      borderLeft: '2px solid var(--brand-primary)',
                      borderRadius: '0 6px 6px 0',
                    }}
                  >
                    {f.executiveSummary}
                  </p>
                ) : f.executiveSummary ? (
                  <p className="exec-summary">{f.executiveSummary}</p>
                ) : null}
                <div className="row-gap">
                  {f.mvpUrl ? <ExternalLinkButton href={f.mvpUrl}>MVP / Demo</ExternalLinkButton> : null}
                  {f.srsRequirementId ? (
                    /^https?:\/\//i.test(f.srsRequirementId) ? (
                      <ExternalLinkButton href={f.srsRequirementId}>SRS link</ExternalLinkButton>
                    ) : (
                      <Badge label={`SRS: ${f.srsRequirementId}`} tone="info" />
                    )
                  ) : null}
                  {role === 'admin' && f.githubPrUrl ? <ExternalLinkButton href={f.githubPrUrl}>GitHub PR</ExternalLinkButton> : null}
                </div>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ── Phase Overview ── */}
      <Section title="Phase Overview">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {phaseRows.map((row) => {
            const completionPct = row.total === 0 ? 0 : Math.round((row.completed / row.total) * 100)
            return (
              <article className="phase-card" key={row.phase.phaseId}>
                <div className="row-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span className="material-symbols-rounded" style={{ color: 'var(--accent-blue)', fontSize: 18 }}>account_tree</span>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{row.phase.phaseName}</p>
                      <p className="small">{row.phase.startDate} → {row.phase.endDate}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{completionPct}%</p>
                      <p className="small">{row.completed}/{row.total} done</p>
                    </div>
                    <Badge
                      label={row.health}
                      tone={row.health === 'Delayed' ? 'danger' : row.health === 'On Track' ? 'success' : 'info'}
                    />
                  </div>
                </div>

                <div className="phase-progress-bar" style={{ marginTop: '0.85rem' }}>
                  <div
                    className="phase-progress-fill"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.6rem' }}>
                  {[
                    { label: 'Total', value: row.total, color: 'var(--text-muted)' },
                    { label: 'In Progress', value: row.inProgress, color: 'var(--accent-blue)' },
                    { label: 'Completed', value: row.completed, color: 'var(--accent-green)' },
                    { label: 'Delayed', value: row.delayed, color: 'var(--brand-primary)' },
                  ].map(({ label, value, color }) => (
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
