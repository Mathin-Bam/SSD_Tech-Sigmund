import { useDroppable, useDndContext } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { CSSProperties } from 'react'
import type { Feature, FeatureStatus, Blocker } from '../../domain/types'
import { KanbanCard } from './KanbanCard'

// ── Column colour palette ──────────────────────────────────
type ColourDef = { accent: string; accentMuted: string; icon: string }

export const COLUMN_META: Record<KanbanColumnId, ColourDef> = {
  'Not Started': {
    accent: '#64748b',
    accentMuted: 'rgba(100,116,139,0.12)',
    icon: 'radio_button_unchecked',
  },
  'In Progress': {
    accent: '#3b82f6',
    accentMuted: 'rgba(59,130,246,0.12)',
    icon: 'pending',
  },
  Testing: {
    accent: '#a78bfa',
    accentMuted: 'rgba(167,139,250,0.12)',
    icon: 'science',
  },
  Completed: {
    accent: '#22c55e',
    accentMuted: 'rgba(34,197,94,0.12)',
    icon: 'check_circle',
  },
  Blocked: {
    accent: '#e31837',
    accentMuted: 'rgba(227,24,55,0.12)',
    icon: 'block',
  },
}

// ── Type for the 5 Kanban statuses ────────────────────────
export type KanbanColumnId = Extract<
  FeatureStatus,
  'Not Started' | 'In Progress' | 'Testing' | 'Completed' | 'Blocked'
>

export const KANBAN_COLUMNS: KanbanColumnId[] = [
  'Not Started',
  'In Progress',
  'Testing',
  'Completed',
  'Blocked',
]

// ── KanbanColumn ──────────────────────────────────────────
export function KanbanColumn({
  id,
  features,
  onCardClick,
  blockers,
}: {
  id: KanbanColumnId
  features: Feature[]
  onCardClick?: (f: Feature) => void
  blockers?: Blocker[]
}) {
  const { setNodeRef, isOver: isDirectlyOver } = useDroppable({ id })
  const { over } = useDndContext()
  const meta = COLUMN_META[id]
  const itemIds = features.map((f) => f.featureId)

  const isOverCardInColumn = over ? itemIds.includes(over.id as string) : false
  const isOver = isDirectlyOver || isOverCardInColumn

  const columnStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    minWidth: 0,
    width: '100%',
    background: isOver ? meta.accentMuted : 'var(--bg-surface)',
    border: `1px solid ${isOver ? meta.accent : 'var(--border)'}`,
    borderRadius: 'var(--radius-lg)' as string,
    backdropFilter: 'blur(8px)',
    transition: 'background 0.18s, border-color 0.18s',
    overflow: 'hidden',
  }

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.85rem 1rem 0.75rem',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    background: 'var(--bg-sidebar)',
    zIndex: 1,
  }

  const bodyStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    padding: '0.75rem 0.75rem',
    minHeight: 120,
    flex: 1,
  }

  return (
    <div ref={setNodeRef} style={columnStyle} aria-label={`${id} column, ${features.length} cards`}>
      {/* Column Header */}
      <header style={headerStyle}>
        <span
          className="material-symbols-rounded"
          aria-hidden="true"
          style={{ fontSize: 16, color: meta.accent, flexShrink: 0 }}
        >
          {meta.icon}
        </span>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text)',
            flex: 1,
            letterSpacing: '-0.01em',
          }}
        >
          {id}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 22,
            height: 22,
            borderRadius: 999,
            background: meta.accentMuted,
            color: meta.accent,
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0 6px',
            border: `1px solid ${meta.accent}33`,
          }}
          aria-label={`${features.length} items`}
        >
          {features.length}
        </span>
      </header>

      {/* Drop zone */}
      <div style={bodyStyle}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {features.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                flex: 1,
                minHeight: 80,
                opacity: 0.35,
              }}
              aria-label="Empty column"
            >
              <span
                className="material-symbols-rounded"
                aria-hidden="true"
                style={{ fontSize: 24, color: 'var(--text-muted)' }}
              >
                inbox
              </span>
              <p
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                No features
              </p>
            </div>
          ) : (
            features.map((f) => <KanbanCard key={f.featureId} feature={f} onClick={onCardClick} blockers={blockers} />)
          )}
        </SortableContext>
      </div>
    </div>
  )
}
