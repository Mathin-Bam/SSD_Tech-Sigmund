import type { CSSProperties, ReactNode } from 'react'

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="page-header" style={{ marginBottom: '2rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{title}</h1>
      {subtitle && (
        <p style={{ color: 'var(--text-muted)', marginTop: '0.375rem', fontSize: '0.9rem' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}


export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'success' | 'warn' | 'danger' | 'info' }) {
  return <span className={`badge badge-${tone}`}>{label}</span>
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  accent = '--accent-blue',
}: {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  accent?: string
}) {
  return (
    <article className="metric-card" style={{ '--metric-accent': `var(${accent})` } as CSSProperties}>
      {icon && <span className="material-symbols-rounded metric-icon">{icon}</span>}
      <p className="muted">{title}</p>
      <h3>{value}</h3>
      {subtitle ? <p className="metric-sub">{subtitle}</p> : null}
    </article>
  )
}

export function ProgressRing({ pct, size = 80 }: { pct: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, pct))
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (clamped / 100) * circ
  return (
    <div className="completion-ring-wrap">
      <div className="completion-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#e31837"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div className="completion-ring-label">{clamped}%</div>
      </div>
    </div>
  )
}

export function Section({ title, children, action, style }: { title: string; children: ReactNode; action?: ReactNode; style?: CSSProperties }) {
  return (
    <section className="section" style={style}>
      <div className="section-header">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ExternalLinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="link-button" href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  )
}
