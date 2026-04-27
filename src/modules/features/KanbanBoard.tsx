import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import { type CSSProperties, useState } from 'react'
import type { Feature, Blocker } from '../../domain/types'
import type { FeatureUpdateFields } from './FeatureEditForm'
import { KanbanCardOverlay } from './KanbanCard'
import { KANBAN_COLUMNS, KanbanColumn, type KanbanColumnId } from './KanbanColumn'

interface KanbanBoardProps {
  features: Feature[]
  onUpdateFeature: (featureId: string, patch: FeatureUpdateFields) => Promise<void>
  onCardClick?: (feature: Feature) => void
  blockers?: Blocker[]
}

export function KanbanBoard({ features, onUpdateFeature, onCardClick, blockers }: KanbanBoardProps) {
  // Track which card is being dragged (for the overlay)
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 5px movement before starting drag — prevents accidental drags
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  // Group features by the 5 Kanban statuses
  const columnFeatures: Record<KanbanColumnId, Feature[]> = {
    'Not Started': [],
    'In Progress': [],
    Testing: [],
    Completed: [],
    Blocked: [],
  }

  for (const f of features) {
    const col = f.status as KanbanColumnId
    if (col in columnFeatures) {
      columnFeatures[col].push(f)
    }
    // Features with other statuses (Planned, In Review, Delayed) are not shown
    // on the Kanban board — they remain accessible in the table view.
  }

  // The card currently being dragged
  const activeFeature = activeId
    ? features.find((f) => f.featureId === activeId)
    : null

  // ── Drag handlers ─────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const featureId = active.id as string
    const overId = over.id as string

    // Determine the target column:
    // `over.id` could be a column id OR another card id (from SortableContext).
    // We resolve: if overId is a valid column key, use it directly;
    // otherwise find which column the hovered card belongs to.
    let targetColumn: KanbanColumnId | undefined

    if (KANBAN_COLUMNS.includes(overId as KanbanColumnId)) {
      targetColumn = overId as KanbanColumnId
    } else {
      // overId is a featureId — find its column
      for (const col of KANBAN_COLUMNS) {
        if (columnFeatures[col].some((f) => f.featureId === overId)) {
          targetColumn = col
          break
        }
      }
    }

    if (!targetColumn) return

    // Only update if the column actually changed
    const currentFeature = features.find((f) => f.featureId === featureId)
    if (!currentFeature) return

    const isKanbanStatus = KANBAN_COLUMNS.includes(currentFeature.status as KanbanColumnId)
    const currentColumn = isKanbanStatus ? (currentFeature.status as KanbanColumnId) : undefined

    if (currentColumn !== targetColumn) {
      // Fire the optimistic mutation — useFeatures handles the revert on error
      void onUpdateFeature(featureId, { status: targetColumn })
    }
  }

  // ── Empty state (no features at all) ─────────────────────
  if (features.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '4rem 2rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)' as string,
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          className="material-symbols-rounded"
          aria-hidden="true"
          style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.5 }}
        >
          view_kanban
        </span>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
          No features found. Upload data or check your filters.
        </p>
      </div>
    )
  }

  // ── Board layout ──────────────────────────────────────────
  const boardStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(220px, 1fr))',
    gap: '0.875rem',
    overflowX: 'auto',
    paddingBottom: '0.5rem',
    alignItems: 'start',
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div style={boardStyle} role="region" aria-label="Kanban board">
        {KANBAN_COLUMNS.map((colId) => (
          <KanbanColumn key={colId} id={colId} features={columnFeatures[colId]} onCardClick={onCardClick} blockers={blockers} />
        ))}
      </div>

      {/* Floating drag overlay — renders a ghost of the card at cursor */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }} modifiers={[snapCenterToCursor]}>
        {activeFeature ? (
          <KanbanCardOverlay feature={activeFeature} blockers={blockers} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
