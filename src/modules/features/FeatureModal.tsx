import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Feature } from '../../domain/types'

export interface FeatureModalProps {
  isOpen: boolean
  onClose: () => void
  feature: Feature | null // null = Create, object = Edit
  onSave: (patch: Partial<Feature>) => Promise<void>
  onDelete?: (featureId: string) => Promise<void>
}

export function FeatureModal({ isOpen, onClose, feature, onSave, onDelete }: FeatureModalProps) {
  const [featureName, setFeatureName] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [priority, setPriority] = useState<Feature['priority']>('Medium')
  const [plannedDeadline, setPlannedDeadline] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditMode = !!feature

  useEffect(() => {
    if (isOpen) {
      setFeatureName(feature?.featureName || '')
      setModuleName(feature?.moduleName || '')
      setPriority(feature?.priority || 'Medium')
      
      // format date to YYYY-MM-DD for input type="date"
      const dateVal = feature?.plannedDeadline ? feature.plannedDeadline.split('T')[0] : new Date().toISOString().split('T')[0]
      setPlannedDeadline(dateVal)
    }
  }, [isOpen, feature])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSave({
        featureName: featureName.trim(),
        moduleName: moduleName.trim(),
        priority,
        plannedDeadline: new Date(plannedDeadline).toISOString()
      })
      onClose()
    } catch (err) {
      console.error('Failed to save feature', err)
      // Ideally show toast error
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
              Planned Deadline
              <input 
                type="date"
                required
                value={plannedDeadline}
                onChange={e => setPlannedDeadline(e.target.value)}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border, rgba(255,255,255,0.1))', background: 'rgba(0,0,0,0.2)', color: 'white', colorScheme: 'dark' }}
              />
            </label>
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
