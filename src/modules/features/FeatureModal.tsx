import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Feature, Subtask } from '../../domain/types'
import { usePhases } from '../../hooks/usePhases'
import { useTeamMembers } from '../../hooks/useTeamMembers'

export interface FeatureModalProps {
  isOpen: boolean
  onClose: () => void
  feature: Feature | null // null = Create, object = Edit
  onSave: (patch: Partial<Feature>) => Promise<void>
  onDelete?: (featureId: string) => Promise<void>
}

const toLocalDatetime = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function FeatureModal({ isOpen, onClose, feature, onSave, onDelete }: FeatureModalProps) {
  const [featureName, setFeatureName] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [priority, setPriority] = useState<Feature['priority']>('Medium')
  const [assignedTo, setAssignedTo] = useState('')
  const [plannedDeadline, setPlannedDeadline] = useState('')
  const [revisedDeadline, setRevisedDeadline] = useState('')
  const [progress, setProgress] = useState<number>(0)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phaseId, setPhaseId] = useState('')

  const { phases } = usePhases()
  const { teamMembers } = useTeamMembers()
  const isEditMode = !!feature

  useEffect(() => {
    // Always reset submitting state when modal opens or closes
    setIsSubmitting(false)
    if (isOpen) {
      setFeatureName(feature?.featureName || '')
      setModuleName(feature?.moduleName || '')
      setPriority(feature?.priority || 'Medium')
      setAssignedTo(feature?.assignedTo || '')
      setProgress(feature?.progress || 0)
      setSubtasks(feature?.subtasks || [])
      setNewTaskTitle('')
      setPhaseId(feature?.phaseId || '')
      
      setPlannedDeadline(toLocalDatetime(feature?.plannedDeadline))
      setRevisedDeadline(toLocalDatetime(feature?.revisedDeadline))
    }
  }, [isOpen, feature?.featureId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const selectedPhase = phases.find(p => p.phaseId === phaseId)
      
      const savePromise = onSave({
        featureName: featureName.trim(),
        moduleName: moduleName.trim(),
        priority,
        assignedTo: assignedTo.trim(),
        progress,
        subtasks,
        phaseId: phaseId || undefined,
        phaseName: selectedPhase?.phaseName || undefined,
        plannedDeadline: plannedDeadline ? new Date(plannedDeadline).toISOString() : new Date().toISOString(),
        revisedDeadline: revisedDeadline ? new Date(revisedDeadline).toISOString() : undefined
      })
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Save timed out. Check your connection.')), 10_000)
      )
      await Promise.race([savePromise, timeoutPromise])
      onClose()
    } catch (err: any) {
      console.error('Failed to save feature:', err)
      alert(`Save failed: ${err?.message ?? 'Unknown error'}. Please try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!feature || !onDelete) return
    const confirmed = window.confirm(`Are you sure you want to delete ${feature.featureName}?`)
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      await onDelete(feature.featureId)
      onClose()
    } catch (err) {
      console.error('Failed to delete feature', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalContent = (
    <div 
      className="modal-backdrop" 
      role="presentation" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={isEditMode ? `Edit feature ${feature?.featureName}` : 'Create new feature'}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f172a', // Solid dark color to prevent excessive transparency
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh', // Prevent overflow on small screens
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border, rgba(255,255,255,0.1))' }}>
          {/* Client Flag Alert */}
          {feature?.isFlagged && (
            <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>⚠️ Client Flag</p>
                  {feature.flagReason && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #cbd5e1)' }}>{feature.flagReason}</p>}
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true)
                    try {
                      await onSave({ isFlagged: false, flagReason: undefined })
                      onClose()
                    } catch (err) {
                      console.error('Resolve flag failed:', err)
                    } finally {
                      setIsSubmitting(false)
                    }
                  }}
                  style={{ flexShrink: 0, padding: '0.3rem 0.75rem', borderRadius: 6, background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', fontSize: '0.78rem', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}
                >
                  Resolve Flag
                </button>
              </div>
            </div>
          )}
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text, #f8fafc)' }}>
            {isEditMode ? 'Edit Task' : 'Create New Task'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
            Task Name
            <input 
              required
              value={featureName}
              onChange={e => setFeatureName(e.target.value)}
              placeholder="E.g. Authentication API"
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
            Module Name
            <input 
              value={moduleName}
              onChange={e => setModuleName(e.target.value)}
              placeholder="E.g. Auth"
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'rgba(0,0,0,0.2)', color: 'white' }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
              Phase
              <select 
                value={phaseId}
                onChange={e => {
                  const newPhaseId = e.target.value
                  setPhaseId(newPhaseId)
                  // Auto-fill deadline if not set
                  if (!plannedDeadline) {
                    const phase = phases.find(p => p.phaseId === newPhaseId)
                    if (phase?.targetDate) {
                      setPlannedDeadline(toLocalDatetime(phase.targetDate))
                    }
                  }
                }}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              >
                <option value="">-- Select Phase --</option>
                {phases.map(p => (
                  <option key={p.phaseId} value={p.phaseId}>{p.phaseName}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
              Priority
              <select 
                value={priority}
                onChange={e => setPriority(e.target.value as Feature['priority'])}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
              Assigned Developer
              <select 
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'rgba(0,0,0,0.2)', color: 'white' }}
              >
                <option value="">-- Unassigned --</option>
                {teamMembers.map((member) => (
                  <option key={member.userId} value={member.name}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
              Planned Deadline
              <input 
                type="datetime-local"
                required
                value={plannedDeadline}
                onChange={e => setPlannedDeadline(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'rgba(0,0,0,0.2)', color: 'white', colorScheme: 'dark' }}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
              Revised Deadline
              <input 
                type="datetime-local"
                value={revisedDeadline}
                onChange={e => setRevisedDeadline(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'rgba(0,0,0,0.2)', color: 'white', colorScheme: 'dark' }}
              />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Progress</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'white' }}>{progress}%</span>
            </div>
            <input 
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brand-primary, #3b82f6)', cursor: 'pointer' }}
            />
          </label>

          {/* Subtasks Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary, #cbd5e1)', margin: 0 }}>
              Tasks Checklist
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {subtasks.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', margin: 0, fontStyle: 'italic' }}>
                  No tasks added yet.
                </p>
              ) : (
                subtasks.map((st) => (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', opacity: st.completed ? 0.6 : 1 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 18, color: st.completed ? '#22c55e' : 'var(--text-muted, #64748b)' }}>
                        {st.completed ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text, #f8fafc)', textDecoration: st.completed ? 'line-through' : 'none' }}>
                        {st.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setSubtasks(prev => prev.map(t => t.id === st.id ? { ...t, completed: !t.completed } : t)) }}
                        style={{ background: 'transparent', border: 'none', color: st.completed ? 'var(--text-muted)' : '#22c55e', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '0.2rem 0.5rem', borderRadius: '4px' }}
                      >
                        {st.completed ? 'Undo' : 'Complete'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setSubtasks(prev => prev.filter(t => t.id !== st.id)) }}
                        style={{ background: 'transparent', border: 'none', color: '#e31837', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '0.2rem 0.5rem', borderRadius: '4px' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <input 
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newTaskTitle.trim()) {
                      setSubtasks(prev => [...prev, { id: crypto.randomUUID(), title: newTaskTitle.trim(), completed: false }])
                      setNewTaskTitle('')
                    }
                  }
                }}
                placeholder="Enter new task..."
                style={{ flex: 1, padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'rgba(0,0,0,0.2)', color: 'white', fontSize: '0.85rem' }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  if (newTaskTitle.trim()) {
                    setSubtasks(prev => [...prev, { id: crypto.randomUUID(), title: newTaskTitle.trim(), completed: false }])
                    setNewTaskTitle('')
                  }
                }}
                style={{ background: 'var(--brand-primary, #3b82f6)', color: 'white', border: 'none', padding: '0 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Add
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border, rgba(255,255,255,0.1))' }}>
            {isEditMode ? (
              <button 
                type="button" 
                onClick={handleDelete}
                disabled={isSubmitting}
                style={{ 
                  padding: '0.6rem 1rem', 
                  borderRadius: '8px', 
                  background: 'rgba(227,24,55,0.15)', 
                  color: '#e31837',
                  border: '1px solid rgba(227,24,55,0.3)',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                Delete Task
              </button>
            ) : <div />}
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                type="button" 
                onClick={onClose}
                disabled={isSubmitting}
                style={{ 
                  padding: '0.6rem 1rem', 
                  borderRadius: '8px', 
                  background: 'transparent', 
                  color: 'var(--text-muted, #94a3b8)',
                  border: '1px solid transparent',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSubmitting}
                style={{ 
                  padding: '0.6rem 1.25rem', 
                  borderRadius: '8px', 
                  background: 'var(--brand-primary, #3b82f6)', 
                  color: 'white',
                  border: 'none',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                }}
              >
                {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
