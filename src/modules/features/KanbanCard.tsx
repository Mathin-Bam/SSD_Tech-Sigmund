import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { Feature } from '../../domain/types'

// ── Priority colour map ───────────────────────────────────
type PriorityColor = { bg: string; text: string; dot: string }

const PRIORITY_COLORS: Record<Feature['priority'], PriorityColor> = {
  Critical: { bg: 'rgba(227,24,55,0.15)', text: '#e31837', dot: '#e31837' },
  High:     { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', dot: '#f59e0b' },
  Medium:   { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', dot: '#3b82f6' },
  Low:      { bg: 'rgba(100,116,139,0.15)', text: '#64748b', dot: '#64748b' },
}

// ── Overlay variant (rendered inside DragOverlay) ─────────
export function KanbanCardOverlay({ feature }: { feature: Feature }) {
  return <KanbanCardInner feature={feature} isDragging />
}

// ── Sortable wrapper ──────────────────────────────────────
export function KanbanCard({ feature, onClick }: { feature: Feature; onClick?: (f: Feature) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: feature.featureId })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    touchAction: 'none',
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={() => onClick?.(feature)}>
      <KanbanCardInner feature={feature} />
    </div>
  )
}

// ── Shared inner card ─────────────────────────────────────
function KanbanCardInner({
  feature,
  isDragging = false,
}: {
  feature: Feature
  isDragging?: boolean
}) {
  const pc = PRIORITY_COLORS[feature.priority]
  const clampedProgress = Math.min(100, Math.max(0, feature.progress))

  const cardStyle: CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)' as string,
    padding: '0.85rem 1rem',
    cursor: 'grab',
    userSelect: 'none',
    backdropFilter: 'blur(8px)',
    boxShadow: isDragging
      ? '0 16px 40px rgba(0,0,0,0.6), 0 0 0 2px var(--brand-primary)'
      : '0 2px 8px rgba(0,0,0,0.3)',
    transition: isDragging ? 'none' : 'box-shadow 0.2s, transform 0.15s, border-color 0.2s',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
  }

  return (
    <article style={cardStyle} aria-label={`Feature: ${feature.featureName}`}>
      {/* Subtle top accent line */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: pc.dot,
          opacity: 0.7,
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        }}
      />

      {/* Feature name */}
      <p
        style={{
          fontWeight: 700,
          fontSize: '0.875rem',
          color: 'var(--text)',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          margin: 0,
        }}
      >
        {feature.featureName}
      </p>

      {/* Module pill */}
      {feature.moduleName && (
        <span
          style={{
            display: 'inline-block',
            alignSelf: 'flex-start',
            padding: '0.15rem 0.55rem',
            borderRadius: 999,
            fontSize: '0.68rem',
            fontWeight: 600,
            background: 'rgba(255,255,255,0.07)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
            letterSpacing: '0.02em',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {feature.moduleName}
        </span>
      )}

      {/* Footer row: priority + progress */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginTop: '0.1rem',
        }}
      >
        {/* Priority badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.18rem 0.5rem',
            borderRadius: 999,
            fontSize: '0.66rem',
            fontWeight: 700,
            background: pc.bg,
            color: pc.text,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: pc.dot,
              display: 'inline-block',
              flexShrink: 0,
            }}
          />
          {feature.priority}
        </span>

        {/* Progress */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}
          aria-label={`Progress: ${clampedProgress}%`}
        >
          <div
            style={{
              width: 48,
              height: 4,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${clampedProgress}%`,
                height: '100%',
                borderRadius: 99,
                background:
                  clampedProgress >= 100
                    ? 'var(--accent-green)'
                    : clampedProgress >= 60
                    ? 'var(--accent-blue)'
                    : 'linear-gradient(90deg, var(--brand-primary), var(--accent-amber))',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <span
            style={{ fontSize: '0.66rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: 28 }}
          >
            {clampedProgress}%
          </span>
        </div>
      </div>
    </article>
  )
}
